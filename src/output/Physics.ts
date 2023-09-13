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

/**
 * A MatterJS engine to keep Scene simpler.
 * All details about MatterJS should be encapsulated here,
 * hopefully not leaking out to Scene, Motion, or other related components. */
export default class Physics {
    /** The evaluator driving physics */
    readonly evaluator: Evaluator;

    /** A Matter JS physics engine. */
    readonly engine: MatterJS.Engine;

    /** A mapping from output names to body IDs */
    private bodyByName: Map<string, OutputBody> = new Map();

    constructor(evaluator: Evaluator) {
        this.evaluator = evaluator;

        /** A Matter JS engine for managing physics on output. */
        this.engine = MatterJS.Engine.create({
            positionIterations: 6,
            // Originally had sleeping enabled, but it prevented collisions from happening on sleeping bodies.
            // In the future, could reenable it and wake up bodies in ways to avoid this collision loss.
            enableSleeping: false,
        });

        // Set timing to match animation factor
        const animationFactor =
            evaluator.database.Settings.settings.animationFactor.get();
        if (animationFactor > 0)
            this.engine.timing.timeScale = 1 / animationFactor;

        // Add a very long static ground to the world along the x-axis.
        MatterJS.Composite.add(
            this.engine.world,
            MatterJS.Bodies.rectangle(0, 250, 200000, 500, { isStatic: true })
        );
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
            // Is it a stage? Update gravity based on it's latest value.
            if (info.output instanceof Stage) {
                // Set the gravity to the Stage's gravity setting.
                // 0.002 is a good scale for our coordinate system, so we convert based on that.
                this.engine.gravity.scale = Math.abs(
                    0.002 * (info.output.gravity / DefaultGravity)
                );
                this.engine.gravity.y = info.output.gravity < 0 ? -1 : 1;
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

                    // Doesn't exist or changed size? Make one and add it to the MatterJS world.
                    if (
                        shape === undefined ||
                        shape.width !== info.width ||
                        shape.height !== info.height
                    ) {
                        // If we already had a body, remove it so we can replace with a new one.
                        if (shape !== undefined) {
                            this.removeOutputBody(name);
                        }

                        // Make a new body for this new output.
                        shape = this.createOutputBody(info, matter);

                        // Remember the body by name
                        this.bodyByName.set(name, shape);

                        // Add to the MatteJS world
                        MatterJS.Composite.add(this.engine.world, shape.body);
                    }

                    // Did we make or find a corresponding body? Sync it.
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
                        // Ensure it's part of collisions
                        shape.body.collisionFilter = getCollisionFilter(true);
                    }
                    // If none are available, remove it from collisions.
                    else {
                        shape.body.collisionFilter = getCollisionFilter(false);
                    }

                    // If no motion, set static
                    MatterJS.Body.setStatic(shape.body, motion === undefined);
                }
                // No motion or matter? Remove it from the MatterJS world so it doesn't mess with collisions.
                else {
                    this.removeOutputBody(name);
                }
            }
        }

        // UPDATE the engine forward by the duration that has elapsed with the new arrangement.
        if (this.evaluator.database.Settings.settings.animationFactor.get() > 0)
            MatterJS.Engine.update(this.engine, delta);
    }

    removeOutputBody(name: string) {
        const outputBody = this.bodyByName.get(name);
        if (outputBody) {
            MatterJS.Composite.remove(this.engine.world, outputBody.body);
            this.bodyByName.delete(name);
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
        // Celar the physics engine.
        MatterJS.World.clear(this.engine.world, false);
        MatterJS.Engine.clear(this.engine);
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

        if (matter === undefined)
            this.body.collisionFilter = getCollisionFilter(false);

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
function getCollisionFilter(included: boolean) {
    return included
        ? {
              group: 1,
              category: 1,
              mask: -1,
          }
        : {
              group: -1,
              category: 2,
              mask: 0,
          };
}
