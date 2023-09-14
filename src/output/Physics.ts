import MatterJS from 'matter-js';
import { PX_PER_METER } from './outputToCSS';
import type Matter from './Matter';
import type { OutputInfo, OutputInfoSet, OutputsByName } from './Scene';
import Phrase from './Phrase';
import Group from './Group';
import Stage, { DefaultGravity } from './Stage';
import type Value from '../values/Value';
import Motion from '../input/Motion';
import type Evaluator from '../runtime/Evaluator';

const TextCategory = 0b0001;
const GroundCategory = 0b0010;
const BarrierCategory = 0b0100;

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

    constructor(evaluator: Evaluator) {
        this.evaluator = evaluator;
    }

    getEngineAtZ(z: number) {
        let engine = this.enginesByZ.get(Math.round(z));

        if (engine === undefined) {
            /** A Matter JS engine for managing physics on output. */
            engine = MatterJS.Engine.create({
                positionIterations: 6,
                // Originally had sleeping enabled, but it prevented collisions from happening on sleeping bodies.
                // In the future, could reenable it and wake up bodies in ways to avoid this collision loss.
                enableSleeping: false,
            });

            // Set timing to match animation factor
            const animationFactor =
                this.evaluator.database.Settings.settings.animationFactor.get();
            if (animationFactor > 0)
                engine.timing.timeScale = 1 / animationFactor;

            // Add a very long static ground to the world along the x-axis.
            MatterJS.Composite.add(
                engine.world,
                MatterJS.Bodies.rectangle(0, 250, 200000, 500, {
                    isStatic: true,
                    collisionFilter: {
                        group: 1,
                        category: GroundCategory,
                        mask: TextCategory | GroundCategory | BarrierCategory,
                    },
                })
            );

            // Set the engine.
            this.enginesByZ.set(z, engine);
        }

        // Return the engine.
        return engine;
    }

    /** Given the current and prior scenes, and the time elapsed since the last one, sync the matter engine. */
    sync(
        current: OutputInfoSet,
        prior: OutputInfoSet,
        entered: OutputsByName,
        exiting: OutputsByName,
        delta: number
    ) {
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
                // 0.002 is a good scale for our coordinate system, so we convert based on that.
                for (const engine of this.enginesByZ.values()) {
                    engine.gravity.scale = Math.abs(
                        0.002 * (info.output.gravity / DefaultGravity)
                    );
                    engine.gravity.y = info.output.gravity < 0 ? -1 : 1;
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

                    // Does the output have no motion but does have matter? Move it to its latest position and apply a velocity.
                    if (motion === undefined) {
                        // const previousPlace = shape.getPlace();

                        MatterJS.Body.setPosition(
                            shape.body,
                            shape.getPosition(
                                info.global.x,
                                info.global.y,
                                info.width,
                                info.height
                            )
                        );
                        // const delta = {
                        //     x: PX_PER_METER * (info.global.x - previousPlace.x),
                        //     y: PX_PER_METER * (info.global.y - previousPlace.y),
                        // };
                        // MatterJS.Body.applyForce();
                        // MatterJS.Body.setVelocity(shape.body, delta);
                    }

                    // Did we make or find a corresponding body? Apply any Place or Velocity overrides in the Motion.
                    if (motion) motion.updateBody(shape);

                    // Set the body's current angle if it has one, otherwise leave it alone.
                    if (info.output.pose.rotation !== undefined)
                        MatterJS.Body.setAngle(
                            shape.body,
                            (info.output.pose.rotation * Math.PI) / 180
                        );

                    // Set matter properties if available.
                    if (matter) {
                        MatterJS.Body.setMass(shape.body, matter.mass);
                        shape.body.restitution = matter.bounciness;
                        shape.body.friction = matter.friction;
                    }

                    // Set the collision filter based on the matter settings.
                    shape.body.collisionFilter = getCollisionFilter(matter);

                    // If no motion, set inertia to infinity
                    // MatterJS.Body.setStatic(shape.body, motion === undefined);
                    MatterJS.Body.setInertia(shape.body, Infinity);
                }
                // No motion or matter? Remove it from the MatterJS world so it doesn't mess with collisions.
                else {
                    this.removeOutputBody(name);
                }
            }
        }

        // UPDATE all the engines forward by the duration that has elapsed with the new arrangement.
        if (
            this.evaluator.database.Settings.settings.animationFactor.get() > 0
        ) {
            for (const engine of this.enginesByZ.values())
                MatterJS.Engine.update(engine, delta);
        }
    }

    removeOutputBody(name: string) {
        const outputBody = this.bodyByName.get(name);
        if (outputBody) {
            // Search through the engines and find the one with the body to remove.
            for (const [z, engine] of this.enginesByZ) {
                // Get the bodies in this engine.
                const bodies = MatterJS.World.allBodies(engine.world);
                // If this world contains the body, remove it from the engine.
                if (bodies.some((body) => body === outputBody.body)) {
                    // Remove the body.
                    MatterJS.Composite.remove(engine.world, outputBody.body);
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

    createOutputBody(info: OutputInfo, matter: Matter | undefined) {
        const { width, height } = info.output.getLayout(info.context);
        return new OutputBody(
            info.global.x,
            info.global.y,
            width,
            height,
            ((info.output.pose.rotation ?? 0) * Math.PI) / 180,
            // Round corners by a fraction of their size
            0.1 * (info.output.size ?? info.context.size),
            matter
        );
    }

    getOutputBody(name: string): OutputBody | undefined {
        return this.bodyByName.get(name);
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
        left: number,
        bottom: number,
        width: number,
        height: number,
        angle: number,
        corner: number,
        matter: Matter | undefined
    ) {
        const position = this.getPosition(left, bottom, width, height);

        this.body = MatterJS.Bodies.rectangle(
            position.x,
            position.y,
            PX_PER_METER * width,
            PX_PER_METER * height,
            // Round corners by a fraction of their size
            {
                chamfer: {
                    radius: corner,
                },
                restitution: matter?.bounciness ?? 0,
                friction: matter?.friction ?? 0,
                mass: (matter?.mass ?? 1) * 10,
                angle,
                sleepThreshold: 500,
            }
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
                  (matter.ground ? GroundCategory : 0) |
                  (matter.barriers ? BarrierCategory : 0),
          }
        : {
              group: -1,
              category: TextCategory,
              mask: 0,
          };
}
