import type TypeOutput from './TypeOutput';
import Place from './Place';
import { createPlace } from './Place';
import Stage from './Stage';
import OutputAnimation from './OutputAnimation';
import type Transition from './Transition';
import type Node from '@nodes/Node';
import type RenderContext from './RenderContext';
import type Evaluator from '@runtime/Evaluator';
import Sequence from './Sequence';
import Pose from './Pose';
import type Value from '../values/Value';
import Matter from 'matter-js';
import { PX_PER_METER } from './outputToCSS';

export type OutputName = string;

export type OutputInfo = {
    output: TypeOutput;
    global: Place;
    local: Place;
    rotation: number | undefined;
    parents: TypeOutput[];
    context: RenderContext;
};

export type Moved = Map<
    OutputName,
    {
        output: TypeOutput;
        prior: Orientation;
        present: Orientation;
    }
>;

export type OutputsByName = Map<OutputName, TypeOutput>;

export type OutputInfoSet = Map<OutputName, OutputInfo>;
export type Orientation = { place: Place; rotation: number | undefined };

/**
 * Derived state of the previous and current Stages.
 * It's responsible for determining what is visible, triggering layout,
 * preparing groups for rendering, and triggering transitions and animations
 * when things enter, move, and exit. It is not itself responsible for animating;
 * that is the job of the Animator. It relies on the project to be updated
 * any time the project reevaluates.
 * */
export default class Scene {
    readonly evaluator: Evaluator;

    /** The current verse being displayed */
    stage: Stage | undefined = undefined;

    /** True if the stage is animated and interactive */
    live = true;

    /** The current fonts that are loaded */
    fontsLoaded: Set<string> = new Set();

    /** The current viewport size from the verse */
    viewportWidth = 0;
    viewportHeight = 0;

    /** The current focus from the verse. */
    focus: Place;
    priorStagePlace: Place | undefined;

    /** The previous and current places where groups are at */
    scene: OutputInfoSet = new Map<OutputName, OutputInfo>();
    priorScene: OutputInfoSet = new Map<OutputName, OutputInfo>();

    /** The current outputs by their corresponding values */
    outputByValue: Map<Value, TypeOutput> = new Map();

    /** The active animations, responsible for tracking transitions and animations on named output. */
    readonly animations = new Map<OutputName, OutputAnimation>();

    /** The current sequence being animated */
    animatingNodes = new Set<Node>();

    /**
     * A callback provided by the instantiator to call when the stage is in need of an update
     * because an animation finished. Currently this is mostly necessary for exiting phrases.
     **/
    readonly exit: (name: OutputName) => void;

    /** A callback for when the animating nodes change, so other parts of the UI can highlight them. */
    readonly tick: (nodes: Set<Node>) => void;

    /** If true, the scene has been stopped and will no longer be animated */
    private stopped = false;

    /** A Matter JS engine for managing physics on output. */
    private physics: Matter.Engine;

    /** A mapping from output names to body IDs */
    private bodyByName: Map<string, OutputRectangle> = new Map();

    constructor(
        evaluator: Evaluator,
        exit: (name: OutputName) => void,
        tick: (nodes: Set<Node>) => void
    ) {
        this.evaluator = evaluator;
        evaluator.scene = this;

        this.exit = exit;
        this.tick = tick;

        // Initialize unintialized defaults.
        this.focus = createPlace(this.evaluator, 0, 0, -6);
        this.priorStagePlace = this.focus;

        // Create an engine
        this.physics = Matter.Engine.create({
            positionIterations: 6,
        });
        // Set timing to match animation factor
        const animationFactor =
            evaluator.database.Settings.settings.animationFactor.get();
        if (animationFactor > 0)
            this.physics.timing.timeScale = 1 / animationFactor;

        // Add a very long static ground to the world along the x-axis.
        Matter.Composite.add(
            this.physics.world,
            Matter.Bodies.rectangle(0, 250, 200000, 500, { isStatic: true })
        );

        // Set the gravity to the stage's default.
        this.physics.gravity.scale = 0.002;
    }

    /**
     * When any of the following inputs change, update the stage accordingly so that the
     * rendered screen reflects it.
     */
    update(
        stage: Stage,
        live: boolean,
        focus: Place,
        width: number,
        height: number,
        context: RenderContext
    ) {
        if (this.stopped) return undefined;

        this.priorStagePlace = this.stage?.place;

        this.stage = stage;
        this.live = live;
        this.focus = focus;
        this.viewportWidth = width;
        this.viewportHeight = height;

        // Create sets of who entered, exited, and present output by their name.
        const entered: OutputsByName = new Map();
        const moved: Moved = new Map();
        const exited: OutputsByName = new Map();
        const present: OutputsByName = new Map();

        // Add the verse to the scene. This is necessary so that animations can get its context.
        const newScene = this.layout(
            this.stage,
            [],
            new Map<OutputName, OutputInfo>(),
            context
        );

        const center = new Place(stage.value, 0, 0, 0);
        newScene.set(stage.getName(), {
            output: stage,
            // We keep these at the center for cacluations, but use the focus place below to detect movement.
            global: center,
            local: center,
            rotation: stage.pose.rotation,
            parents: [],
            context,
        });

        // Based on the places, figure out which output is present and visible.
        for (const [name, info] of newScene) {
            const output = info.output;

            // Add this name and phrase to the present sets.
            present.set(name, output);

            // Was this phrase not previously present? Add to the entered set.
            if (!this.scene.has(name)) entered.set(name, output);

            // Did the place change? Note the move.
            const priorOutputInfo = this.scene.get(name);
            const priorLocal =
                output instanceof Stage
                    ? this.priorStagePlace
                    : priorOutputInfo?.local;
            const currentLocal =
                output instanceof Stage ? output.place : info.local;
            if (
                priorLocal &&
                currentLocal &&
                (priorLocal.x !== currentLocal.x ||
                    priorLocal.y !== currentLocal.y ||
                    priorLocal.z !== currentLocal.z)
            ) {
                // Mark it moved, and remember the positioning so we can generate animations.
                moved.set(name, {
                    output: output,
                    prior: {
                        place: priorLocal,
                        rotation: priorOutputInfo?.rotation,
                    },
                    present: {
                        place: currentLocal,
                        rotation: info.output.pose.rotation,
                    },
                });
            }
        }

        // A mapping from exiting groups to where they previously were.
        const exiting: OutputInfoSet = new Map();

        // Now that we have a list of everyone present, remove everyone that was present in the prior scene that is no longer, and note that they exited.
        // We only do this if this is an animated stage; exiting isn't animated on non-live stages.
        if (live) {
            for (const [name, info] of this.scene) {
                const output = info.output;
                if (!newScene.has(name)) {
                    // If the phrase has an exit squence, then add it to the phrases to keep rendering
                    // and remember it's current global place, so we can render it there.
                    if (output.exiting) {
                        exited.set(name, output);
                        const place = info.global;
                        // Use the global place since it's now parent-less.
                        const newInfo = {
                            output,
                            global: place,
                            local: place,
                            rotation: info.rotation,
                            context: info.context,
                            parents: [this.stage],
                        };
                        // Add to the exiting list for the verse to render.
                        exiting.set(name, newInfo);
                        // Add to the present list so that when we later animate,
                        // it's animation record is updated.
                        present.set(name, output);
                        // Re-add to the scene so that animations can get info.
                        newScene.set(name, newInfo);
                    }
                }
            }
        }

        // Remember the places, so that exiting phrases after the next change have them above.
        this.priorScene = this.scene;
        this.scene = newScene;

        this.outputByValue = new Map();
        for (const [, output] of this.scene)
            this.outputByValue.set(output.output.value, output.output);

        // Sync this scene with the Matter engine.
        this.syncPhysics(
            this.scene,
            this.priorScene,
            entered,
            exited,
            this.evaluator.timeDelta ?? 0
        );

        // Return the layout for rendering.
        return {
            entered,
            present,
            moved,
            exiting,
            // We pass back an animation function so that the view can start animating once it's refreshed
            // DOM elements. This way the animation handlers can assume DOM elements are ready for animation.
            animate: () => {
                if (this.live) this.animate(present, entered, moved, exited);
            },
        };
    }

    /**
     * Given a list of entered, moved, and exited named output,
     * update the active animations. Returns the set of immediate exits for
     * deletion.
     */
    animate(
        present: Map<OutputName, TypeOutput>,
        entered: Map<OutputName, TypeOutput>,
        moved: Map<
            OutputName,
            {
                output: TypeOutput;
                prior: Orientation;
                present: Orientation;
            }
        >,
        exited: Map<OutputName, TypeOutput>
    ): Set<OutputName> {
        if (this.stopped) return new Set();

        // Update the phrase of all present and exited animations, potentially
        // ending and starting animations.
        for (const [name, output] of present) {
            const animation = this.animations.get(name);
            const info = this.scene.get(name);
            if (info) {
                if (animation) {
                    animation.update(output, info?.context, entered.has(name));
                } else if (output.isAnimated()) {
                    const animation = new OutputAnimation(
                        this,
                        output,
                        info.context,
                        entered.has(name)
                    );
                    this.animations.set(name, animation);
                }
            }
            // Otherwise, there must not be any animation on this name,
            // because otherwise we would have created an animation.
        }

        // Trigger moves.
        for (const [name, change] of moved) {
            const animation = this.animations.get(name);
            if (animation) animation.move(change.prior, change.present);
        }

        // Trigger exits for animated output, keeping track of immediate exits.
        const done = new Set<OutputName>();
        for (const [name] of exited) {
            const animation = this.animations.get(name);
            // If we have an animation record, trigger exit
            if (animation) {
                animation.exit();
                // If it's already done (for a variety of reasons), end it.
                if (animation.done()) this.exited(animation);
            }
        }
        return done;
    }

    stop() {
        this.stopped = true;
        this.animations.forEach((animation) => animation.exited());
    }

    exited(animation: OutputAnimation) {
        const name = animation.output.getName();
        this.animations.delete(name);
        this.scene.delete(name);
        this.exit(name);
    }

    startingSequence(transitions: Transition[]) {
        for (const transition of transitions) {
            this.animatingNodes.add(transition.pose.value.creator);
        }
        this.tick(this.animatingNodes);
    }

    endingSequence(transitions: Transition[]) {
        for (const transition of transitions) {
            this.animatingNodes.delete(transition.pose.value.creator);
        }
        this.tick(this.animatingNodes);
    }

    // A top down layout algorithm that places groups first, then their subgroups, and uses the
    // ancestor list to compute global places for each group.
    layout(
        output: TypeOutput,
        parents: TypeOutput[],
        outputInfo: Map<OutputName, OutputInfo>,
        context: RenderContext
    ) {
        // Get the name of the output
        const name = output.getName();
        // Add this output to the parent stack.
        parents.unshift(output);
        // Update the context passed to children.
        context = output.getRenderContext(context);
        // Get the info for the name.
        const info = outputInfo.get(name);
        // Get this output's place, so we can offset its subgroups.
        const parentPlace = info?.global;
        // Get the places of each of this group's subgroups.
        for (const [subgroup, place] of output.getLayout(context).places) {
            // Set the place of this subgroup, offseting it by the parent's position to keep it in global coordinates.
            outputInfo.set(subgroup.getName(), {
                output: subgroup,
                local: place,
                global: parentPlace ? place.offset(parentPlace) : place,
                rotation: info?.rotation,
                context,
                parents: parents.slice(),
            });
            // Now that this subgroup's position is set, layout the subgroup's subgroups.
            this.layout(subgroup, parents, outputInfo, context);
        }
        // Remove this group from the top of the parent stack.
        parents.shift();

        return outputInfo;
    }

    /** Computes velocity in meters per second. */
    getOutputVelocity(
        name: string,
        output: OutputInfo,
        prior: OutputInfoSet,
        secondsElapsed: number
    ) {
        const currentPlace = output.global;
        const priorPlace = prior.get(name)?.global;

        // If we don't know where it was before, it has no velocity
        if (priorPlace === undefined) return undefined;

        // If the output has a moving sequence, use it's duration. If it has a pose, use the phrase's duration. Otherwise, use the given duration between frames.
        const duration =
            output.output.moving instanceof Sequence
                ? output.output.moving.duration
                : output.output.moving instanceof Pose
                ? output.output.duration
                : secondsElapsed;

        return {
            vx: (currentPlace.x - priorPlace.x) / duration,
            vy: (currentPlace.y - priorPlace.y) / duration,
        };
    }

    getOutputByValue(value: Value) {
        return this.outputByValue.get(value);
    }

    /** Given the current and prior scenes, and the time elapsed since the last one, sync the matter engine. */
    syncPhysics(
        current: OutputInfoSet,
        prior: OutputInfoSet,
        entered: OutputsByName,
        exiting: OutputsByName,
        delta: number
    ) {
        // REMOVE all of the exited outputs from the engine.

        // 1) find the body IDs of the names removed.
        const exitedBodies = Array.from(exiting.values())
            .map((output) => this.bodyByName.get(output.getName())?.body)
            .filter((body): body is Matter.Body => body !== undefined);

        // 2) Remove the bodies from the engine
        Matter.Composite.remove(this.physics.world, exitedBodies, true);

        // 3) Remove the bodies
        for (const name of exiting.keys()) this.bodyByName.delete(name);

        // CREATE and UPDATE bodies for all outputs currently in the scene.

        // 1) Create a body for each output.
        for (const [name, info] of current) {
            if (!(info.output instanceof Stage)) {
                // Create a rectangle for the output
                let shape: OutputRectangle | undefined =
                    this.createRectangle(info);

                // Just entered? Remember the new body we just made.
                if (entered.has(name)) {
                    // Remember the body by name
                    this.bodyByName.set(name, shape);

                    // Add to the engine
                    Matter.Composite.add(this.physics.world, shape.body);
                }
                // Already on the scene? Update the body's verticies with the new shape.
                else {
                    // const preliminary = shape;
                    shape = this.bodyByName.get(name);
                    // if (shape)
                    //     Matter.Body.setVertices(
                    //         shape.body,
                    //         preliminary.body.vertices
                    //     );
                }
                // Did we find a corresponding body? Update it.
                if (shape) {
                    // Set the body's current angle if it has one, otherwise leave it alone.
                    if (info.output.pose.rotation !== undefined)
                        Matter.Body.setAngle(
                            shape.body,
                            (info.output.pose.rotation * Math.PI) / 180
                        );
                }
            }
        }

        // UPDATE the engine forward by the duration that has elapsed with the new arrangement.
        if (this.evaluator.database.Settings.settings.animationFactor.get() > 0)
            Matter.Engine.update(this.physics, delta);
    }

    createRectangle(info: OutputInfo) {
        const { width, height } = info.output.getLayout(info.context);
        return new OutputRectangle(
            info.global.x,
            info.global.y,
            width,
            height,
            ((info.output.pose.rotation ?? 0) * Math.PI) / 180,
            // Round corners by a fraction of their size
            0.1 * (info.output.size ?? info.context.size)
        );
    }

    getOutputPlacement(
        name: string
    ): { x: number; y: number; angle: number } | undefined {
        const rect = this.bodyByName.get(name);
        return rect?.getPlacement();
    }
}

/** This Matter.Body wrapper helps us remember width and height, avoiding redundant computation. */
class OutputRectangle {
    readonly body: Matter.Body;
    readonly width: number;
    readonly height: number;
    constructor(
        left: number,
        bottom: number,
        width: number,
        height: number,
        angle: number,
        corner: number
    ) {
        this.body = Matter.Bodies.rectangle(
            // Body center is half the width from left
            PX_PER_METER * (left + width / 2),
            // Negate top to flip y-axes than add half of height to get center
            PX_PER_METER * -(bottom + height / 2),
            PX_PER_METER * width,
            PX_PER_METER * height,
            // Round corners by a fraction of their size
            {
                chamfer: {
                    radius: corner,
                },
                restitution: 0,
                friction: 0.8,
                angle,
                mass: 10,
            }
        );

        this.width = width;
        this.height = height;
    }

    getPlacement() {
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
