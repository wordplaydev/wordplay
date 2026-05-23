import MatterJS from 'matter-js';
import { get } from 'svelte/store';
import { animationFactor } from '@db/Database';
import type { ReboundEvent } from '@input/Collision';
import Collision from '@input/Collision';
import Motion from '@input/Motion';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import type { OutputInfo, OutputInfoSet } from '@output/Animator';
import { Circle, Polygon, Rectangle } from '@output/Form';
import Group from '@output/Group';
import type Matter from '@output/Matter';
import { PX_PER_METER } from '@output/outputToCSS';
import Phrase from '@output/Phrase';
import type Shape from '@output/Shape';
import Stage, { DefaultGravity } from '@output/Stage';

const TextCategory = 0b0001;
const ShapeCategory = 0b0010;

/**
 * A MatterJS engine to keep Scene simpler.
 * All details about MatterJS should be encapsulated here,
 * hopefully not leaking out to Scene, Motion, or other related components. */
export default class Physics {
    /** The evaluator driving physics */
    readonly evaluator: Evaluator;

    /** A set of Matter JS physics engines, by integer z coordinate. */
    readonly enginesByZ: Map<number, MatterJS.Engine> = new Map();

    /** A mapping from output names to body IDs */
    private bodyByName: Map<string, OutputBody> = new Map();

    /** The latest stage synced */
    private stage: Stage | undefined = undefined;

    /** The hash of the barriers previously added */
    private previousShapes: Shape[] = [];
    private currentShapeBodies: {
        body: MatterJS.Body;
        engine: MatterJS.Engine;
    }[] = [];

    /** Simulated time owed to the engine but not yet stepped, in ms.
     *  We feed Matter.js fixed-size sub-steps to keep collision detection
     *  frame-rate-independent (variable elapsed values cause tunneling). */
    private accumulator = 0;

    /** Bodies whose Placement-driven displacement this frame is large enough
     *  to risk tunneling. tick() interpolates them across sub-steps so the
     *  engine can catch overlaps along the path. */
    private sweepingBodies: Map<
        OutputBody,
        { from: { x: number; y: number }; to: { x: number; y: number } }
    > = new Map();

    constructor(evaluator: Evaluator) {
        this.evaluator = evaluator;
    }

    getEngineAtZ(z: number) {
        let engine = this.enginesByZ.get(Math.round(z));

        // No engine yet for this depth? Make one.
        if (engine === undefined) {
            // A Matter JS engine for managing physics on output.
            engine = MatterJS.Engine.create({
                positionIterations: 10,
                velocityIterations: 8,
                // Originally had sleeping enabled, but it prevented collisions from happening on sleeping bodies.
                // In the future, could reenable it and wake up bodies in ways to avoid this collision loss.
                enableSleeping: false,
            });

            // Set the engine. animationFactor is applied per-tick when
            // converting wall-clock elapsed to simulated time, so the engine's
            // own timeScale stays at 1.
            this.enginesByZ.set(z, engine);

            // Cap velocity
            const limitMaxSpeed = () => {
                for (const { body } of this.bodyByName.values()) {
                    const maxSpeed = 100;
                    if (body.velocity.x > maxSpeed) {
                        MatterJS.Body.setVelocity(body, {
                            x: maxSpeed,
                            y: body.velocity.y,
                        });
                    }

                    if (body.velocity.x < -maxSpeed) {
                        MatterJS.Body.setVelocity(body, {
                            x: -maxSpeed,
                            y: body.velocity.y,
                        });
                    }

                    if (body.velocity.y > maxSpeed) {
                        MatterJS.Body.setVelocity(body, {
                            x: body.velocity.x,
                            y: maxSpeed,
                        });
                    }

                    if (body.velocity.y < -maxSpeed) {
                        MatterJS.Body.setVelocity(body, {
                            x: -body.velocity.x,
                            y: -maxSpeed,
                        });
                    }
                }
            };
            MatterJS.Events.on(engine, 'beforeUpdate', limitMaxSpeed);

            // Listen for collision starts.
            MatterJS.Events.on(engine, 'collisionStart', (event) => {
                this.report(
                    event.pairs.map((pair) => {
                        return {
                            subject: pair.bodyA.label,
                            object: pair.bodyB.label,
                            direction: pair.collision.penetration,
                            starting: true,
                        };
                    }),
                );
            });

            // Listen for collision ends.
            MatterJS.Events.on(engine, 'collisionEnd', (event) => {
                this.report(
                    event.pairs.map((pair) => {
                        return {
                            subject: pair.bodyA.label,
                            object: pair.bodyB.label,
                            direction: pair.collision.penetration,
                            starting: false,
                        };
                    }),
                );
            });
        }

        // Return the engine.
        return engine;
    }

    readonly ShapeOptions = {
        isStatic: true,
        collisionFilter: {
            group: 1,
            category: ShapeCategory,
            mask: TextCategory | ShapeCategory,
        },
    };

    /** Rotation is degrees */
    createRectangle(rectangle: Rectangle, rotation: number | undefined) {
        // Compute rectangle boundaries in engine coordinates.
        const left = rectangle.getLeft() * PX_PER_METER;
        const right =
            (rectangle.getLeft() + rectangle.getWidth()) * PX_PER_METER;
        const top = -rectangle.getTop() * PX_PER_METER;
        const bottom =
            -(rectangle.getTop() - rectangle.getHeight()) * PX_PER_METER;

        // Place the rectangle at the center of bounds
        const rect = MatterJS.Bodies.rectangle(
            (left + right) / 2,
            (top + bottom) / 2,
            Math.abs(right - left),
            Math.abs(bottom - top),
            this.ShapeOptions,
        );

        if (rotation !== undefined && rotation !== 0)
            MatterJS.Body.rotate(rect, (rotation * Math.PI) / 180);

        return rect;
    }

    /** Create a circle form */
    createCircle(circle: Circle) {
        // Compute rectangle boundaries in engine coordinates.
        const x = circle.x * PX_PER_METER;
        const y = -circle.y * PX_PER_METER;
        const radius = circle.radius * PX_PER_METER;

        // Place the rectangle at the center of bounds
        return MatterJS.Bodies.circle(x, y, radius, this.ShapeOptions);
    }

    /** Create a circle form */
    createPolygon(polygon: Polygon) {
        // Compute rectangle boundaries in engine coordinates.
        const x = polygon.x * PX_PER_METER;
        const y = -polygon.y * PX_PER_METER;
        const radius = polygon.radius * PX_PER_METER;

        // Place the rectangle at the center of bounds
        return MatterJS.Bodies.polygon(
            x,
            y,
            polygon.sides,
            radius,
            this.ShapeOptions,
        );
    }

    /** Given the current and prior scenes, and the time elapsed since the last one, sync the matter engine. */
    sync(
        stage: Stage,
        current: OutputInfoSet,
        exiting: Map<string, OutputInfo>,
    ) {
        // Update the stage
        this.stage = stage;

        // REMOVE all of the exited outputs from the engine.
        for (const name of exiting.keys()) this.removeOutputBody(name);

        // CREATE and UPDATE bodies for all outputs currently in the scene.

        // Create an index of all of the Motion stream's recent places so we can map output's places back to motion streams.
        const motionByPlace = new Map<Value, Motion>();
        for (const motion of this.evaluator.getBasisStreamsOfType(Motion)) {
            for (const value of motion.values.slice(-10))
                motionByPlace.set(value.value, motion);
        }

        // Iterate through all of the output in the current scene.
        for (const [name, info] of current) {
            // Is it inside a group? Pass. We only include top level elements in physics, since there's a single coordinate system that they share.
            // Groups have their own local coordinate systems.
            if (info.parents[0] instanceof Group) {
                continue;
            }

            // Is it a stage? Update all engine's gravity based on the stage's latest value.
            if (info.output instanceof Stage) {
                // Set the gravity to the Stage's gravity setting.
                for (const engine of this.enginesByZ.values()) {
                    // The scale is the pixels per meter
                    engine.gravity.scale = 1 / (PX_PER_METER * 2);
                    engine.gravity.y =
                        (info.output.gravity ?? DefaultGravity) / 20;
                }
            }
            // Other kind of output? Sync it.
            else {
                // Does the output have matter?
                const matter =
                    info.output instanceof Phrase ||
                    info.output instanceof Group
                        ? info.output.matter
                        : undefined;

                // Is there a motion stream responsible for this output's place? The motion may
                const motion = info.output.place
                    ? motionByPlace.get(info.output.place.value)
                    : undefined;

                // If the output has matter or is in motion, make sure it's in the MatterJS world.
                if (matter || motion) {
                    // Get the body that we already made using it's name.
                    let shape = this.bodyByName.get(name);

                    // Doesn't exist or changed size? Make one and add it to the MatterJS world
                    // for it's z value.
                    if (
                        shape === undefined ||
                        shape.width !== info.width ||
                        shape.height !== info.height
                    ) {
                        // Get the engine for this z depth
                        const engine = this.getEngineAtZ(info.global.z);

                        // If we already had a body, remove it so we can replace with a new one.
                        if (shape !== undefined) {
                            this.removeOutputBody(name);
                        }

                        // Make a new body for this new output.
                        shape = this.createOutputBody(info, matter);

                        // Remember the body by name
                        this.bodyByName.set(name, shape);

                        // Add to the MatterJS world
                        MatterJS.Composite.add(engine.world, shape.body);
                    }

                    // No motion but has matter? Either teleport directly or,
                    // if the displacement is large enough to risk skipping
                    // through another body, defer to tick() which will sweep
                    // across sub-steps.
                    if (motion === undefined) {
                        const target = shape.getPosition(
                            info.global.x,
                            info.global.y,
                            info.width,
                            info.height,
                        );
                        const dx = target.x - shape.body.position.x;
                        const dy = target.y - shape.body.position.y;
                        const halfMin =
                            (PX_PER_METER *
                                Math.min(shape.width, shape.height)) /
                            2;
                        if (dx * dx + dy * dy <= halfMin * halfMin) {
                            MatterJS.Body.setPosition(shape.body, target);
                        } else {
                            this.sweepingBodies.set(shape, {
                                from: {
                                    x: shape.body.position.x,
                                    y: shape.body.position.y,
                                },
                                to: target,
                            });
                        }
                    }

                    // Did we make or find a corresponding body? Apply any Place or Velocity overrides in the Motion.
                    if (motion) motion.updateBody(shape);

                    // Set the body's current angle if it has one, otherwise leave it alone.
                    if (info.output.pose.rotation !== undefined)
                        MatterJS.Body.setAngle(
                            shape.body,
                            (info.output.pose.rotation * Math.PI) / 180,
                        );

                    // Set matter properties if available.
                    if (matter) {
                        MatterJS.Body.setMass(shape.body, matter.mass);
                        shape.body.restitution = matter.bounciness;
                        shape.body.friction = matter.friction;
                    }

                    // Set the collision filter based on the matter settings.
                    shape.body.collisionFilter = getCollisionFilter(matter);

                    // Bodies whose position is set externally (by Placement or
                    // a static Place) become sensors: they still fire collision
                    // events, but the solver doesn't apply separation impulses
                    // that would fight the per-frame setPosition. Without this,
                    // the solver pushes overlapping bodies apart every step,
                    // sync teleports them back, and Collision oscillates between
                    // start/end at frame rate.
                    shape.body.isSensor = motion === undefined;

                    // If no motion, set inertia to infinity, since the output is immovable.
                    MatterJS.Body.setInertia(shape.body, Infinity);
                }
                // No motion or matter? Remove it from the MatterJS world so it doesn't mess with collisions.
                else {
                    this.removeOutputBody(name);
                }
            }
        }

        // Sync barriers.
        if (this.stage) {
            const shapes = this.stage.getShapes();

            // If the shapes changed update them in the engine.
            if (
                this.previousShapes.length !== shapes.length ||
                !this.previousShapes.every((shape, index) =>
                    shape.value.isEqualTo(shapes[index].value),
                )
            ) {
                // Remove the bodies previously added
                for (const record of this.currentShapeBodies)
                    MatterJS.Composite.remove(record.engine.world, record.body);

                // Add the revised bodies
                this.currentShapeBodies = [];
                for (const barrier of shapes) {
                    const shape =
                        barrier.form instanceof Rectangle
                            ? this.createRectangle(
                                  barrier.form,
                                  barrier.pose.rotation,
                              )
                            : barrier.form instanceof Circle
                              ? this.createCircle(barrier.form)
                              : barrier.form instanceof Polygon
                                ? this.createPolygon(barrier.form)
                                : undefined;

                    if (shape) {
                        if (barrier.name) shape.label = barrier.getName();
                        const engine = this.getEngineAtZ(barrier.form.getZ());
                        MatterJS.Composite.add(engine.world, shape);
                        this.currentShapeBodies.push({
                            body: shape,
                            engine: engine,
                        });
                    }
                }

                // Remember what we added.
                this.previousShapes = shapes;
            }
        }
    }

    tick(elapsed: number) {
        const factor = get(animationFactor);

        // Frozen world (animationFactor 0 / calm mode): finalize any deferred
        // moves so bodies stay where Placement put them, then skip simulation.
        if (factor <= 0) {
            for (const [shape, move] of this.sweepingBodies)
                MatterJS.Body.setPosition(shape.body, move.to);
            this.sweepingBodies.clear();
            return;
        }

        // Convert wall-clock elapsed to simulated elapsed. animationFactor
        // is an inverse-speed multiplier (4 = ¼ speed, 0.1 = 10× speed).
        // Cap the per-call delta so a long pause / hidden tab doesn't dump
        // huge time into the accumulator.
        this.accumulator += Math.min(elapsed / factor, 100);

        // Run as many fixed sub-steps as fit. Cap iterations so very slow
        // machines don't spiral; better to let simulated time fall behind
        // real time than feed huge variable steps to the engine, which
        // causes tunneling and missed collisions.
        const FIXED_STEP_MS = 16;
        const MAX_STEPS = 4;
        const steps = Math.min(
            Math.floor(this.accumulator / FIXED_STEP_MS),
            MAX_STEPS,
        );

        if (steps > 0) {
            for (let i = 1; i <= steps; i++) {
                // Interpolate sweeping bodies along their path so the engine
                // can detect overlaps at intermediate positions.
                const t = i / steps;
                for (const [shape, move] of this.sweepingBodies) {
                    MatterJS.Body.setPosition(shape.body, {
                        x: move.from.x + (move.to.x - move.from.x) * t,
                        y: move.from.y + (move.to.y - move.from.y) * t,
                    });
                }
                for (const engine of this.enginesByZ.values())
                    MatterJS.Engine.update(engine, FIXED_STEP_MS);
            }
            this.accumulator -= steps * FIXED_STEP_MS;
            // Drop remainder when we hit the cap so it doesn't grow forever.
            if (steps === MAX_STEPS) this.accumulator = 0;
        }

        // Ensure sweeping bodies reach their final target (covers steps == 0).
        for (const [shape, move] of this.sweepingBodies)
            MatterJS.Body.setPosition(shape.body, move.to);
        this.sweepingBodies.clear();
    }

    removeOutputBody(name: string) {
        const outputBody = this.bodyByName.get(name);
        if (outputBody) {
            // Search through the engines and find the one with the body to remove.
            for (const [z, engine] of this.enginesByZ) {
                if (MatterJS.World.allBodies) {
                    // Get the bodies in this engine.
                    const bodies = MatterJS.World.allBodies(engine.world);
                    // If this world contains the body, remove it from the engine.
                    if (bodies.some((body) => body === outputBody.body)) {
                        // Remove the body.
                        MatterJS.Composite.remove(
                            engine.world,
                            outputBody.body,
                        );
                        this.bodyByName.delete(name);

                        // If the engine is now empty, remove the engine.
                        if (bodies.length === 1) {
                            this.stopEngine(engine);
                            this.enginesByZ.delete(z);
                        }

                        return;
                    }
                }
            }
        }
    }

    createOutputBody(info: OutputInfo, matter: Matter | undefined) {
        const { width, height } = info.output.getLayout(info.context);
        return new OutputBody(
            info.output.getName(),
            info.global.x,
            info.global.y,
            width,
            height,
            ((info.output.pose.rotation ?? 0) * Math.PI) / 180,
            // Round corners by a fraction of their size
            (matter?.roundedness ?? 0.1) *
                (info.output.size ?? info.context.size),
            matter,
        );
    }

    /** Get the body corresponding to the given output name */
    getOutputBody(name: string): OutputBody | undefined {
        return this.bodyByName.get(name);
    }

    /** Report the given collisions to the evaluator's collision streams */
    report(rebounds: ReboundEvent[]) {
        // Get the streams.
        const collisions = this.evaluator.getBasisStreamsOfType(Collision);

        for (const collision of collisions) {
            for (const rebound of rebounds) collision.react(rebound);
        }
    }

    stop() {
        // Clear the physics engines.
        for (const engine of this.enginesByZ.values()) {
            this.stopEngine(engine);
        }
    }

    stopEngine(engine: MatterJS.Engine) {
        MatterJS.World.clear(engine.world, false);
        MatterJS.Engine.clear(engine);
    }
}

/** This Matter.Body wrapper helps us remember width and height, avoiding redundant computation. */
export class OutputBody {
    readonly body: MatterJS.Body;
    readonly width: number;
    readonly height: number;
    constructor(
        name: string,
        left: number,
        bottom: number,
        width: number,
        height: number,
        angle: number,
        corner: number,
        matter: Matter | undefined,
    ) {
        const position = this.getPosition(left, bottom, width, height);

        this.body = MatterJS.Bodies.rectangle(
            position.x,
            position.y,
            PX_PER_METER * width,
            PX_PER_METER * height,
            // Round corners by a fraction of their size
            {
                chamfer: { radius: corner * PX_PER_METER },
                restitution: matter?.bounciness ?? 0,
                friction: matter?.friction ?? 0,
                mass: (matter?.mass ?? 1) * 10,
                angle,
                sleepThreshold: 500,
                label: name,
            },
        );

        this.body.collisionFilter = getCollisionFilter(matter);

        this.width = width;
        this.height = height;
    }

    /** Convert a Place position into a stage Place. */
    getPosition(left: number, bottom: number, width: number, height: number) {
        return {
            // Body center is half the width from left
            x: PX_PER_METER * (left + width / 2),
            // Negate top to flip y-axes than add half of height to get center
            y: PX_PER_METER * -(bottom + height / 2),
        };
    }

    /** Convert the MatterJS position into stage Place values. */
    getPlace() {
        return {
            x: this.body.position.x / PX_PER_METER - this.width / 2,
            y: -this.body.position.y / PX_PER_METER - this.height / 2,
            angle:
                (isNaN(this.body.angle) ||
                this.body.angle === Infinity ||
                this.body.angle === -Infinity
                    ? 0
                    : this.body.angle * 180) / Math.PI,
        };
    }
}

/** Abstract away MatterJS's confusing collision filtering system. */
function getCollisionFilter(matter: Matter | undefined) {
    return matter
        ? {
              group: 0,
              category: TextCategory,
              mask:
                  (matter.text ? TextCategory : 0) |
                  (matter.shapes ? ShapeCategory : 0),
          }
        : { group: -1, category: TextCategory, mask: 0 };
}
