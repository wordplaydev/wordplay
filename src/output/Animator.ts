import type Output from './Output';
import Place from './Place';
import { createPlace } from './Place';
import Stage from './Stage';
import OutputAnimation, { AnimationState } from './OutputAnimation';
import type Transition from './Transition';
import type Node from '@nodes/Node';
import type RenderContext from './RenderContext';
import type Evaluator from '@runtime/Evaluator';
import Sequence from './Sequence';
import Pose from './Pose';
import type Value from '../values/Value';
import Physics from './Physics';
import Scene from '@input/Scene';

export type OutputName = string;

export type OutputInfo = {
    output: Output;
    global: Place;
    local: Place;
    rotation: number | undefined;
    width: number;
    height: number;
    parents: Output[];
    context: RenderContext;
};

export type Moved = Map<
    OutputName,
    {
        output: Output;
        prior: Orientation;
        present: Orientation;
    }
>;

export type OutputsByName = Map<OutputName, Output>;

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
export default class Animator {
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

    /** The current scene and its placement info */
    scene: OutputInfoSet = new Map<OutputName, OutputInfo>();

    /** The previous secene and their placement info */
    priorScene: OutputInfoSet = new Map<OutputName, OutputInfo>();

    /** Output info for exited outputs */
    exitedInfo = new Map<OutputName, OutputInfo>();

    /** The current outputs by their corresponding values */
    outputByPlace: Map<Value, Output[]> = new Map();

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

    /** A physics engine for managing motion and collisions of output. */
    readonly physics: Physics;

    constructor(
        evaluator: Evaluator,
        exit: (name: OutputName) => void,
        tick: (nodes: Set<Node>) => void,
    ) {
        this.evaluator = evaluator;
        evaluator.scene = this;

        this.exit = exit;
        this.tick = tick;

        // Initialize unintialized defaults.
        this.focus = createPlace(this.evaluator, 0, 0, -6);
        this.priorStagePlace = this.focus;

        this.physics = new Physics(evaluator);
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
        context: RenderContext,
    ) {
        if (this.stopped) return undefined;

        this.priorStagePlace = this.stage?.place;

        this.stage = stage;
        this.live = live;
        this.focus = focus;
        this.viewportWidth = width;
        this.viewportHeight = height;

        /** Outputs that entered in this frame and were not present in the last */
        const entered: OutputsByName = new Map();
        /** Outputs that moved between this frame and the last */
        const moved: Moved = new Map();
        /** Outputs that are present in this frame */
        const present: OutputsByName = new Map();

        // Add the stage to the scene. This is necessary so that animations can get its context.
        const newScene = this.layout(
            this.stage,
            [],
            new Map<OutputName, OutputInfo>(),
            context,
        );

        const center = new Place(stage.value, 0, 0, 0);
        newScene.set(stage.getName(), {
            output: stage,
            // We keep these at the center for cacluations, but use the focus place below to detect movement.
            global: center,
            local: center,
            width: 0,
            height: 0,
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
            if (!this.scene.has(name)) {
                entered.set(name, output);
            }

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
                    // If the output has an exit animation and we didn't already do it, then trigger one.
                    // Remember it's global location since it will no longer be placed.
                    const exitAnimation = this.animations.get(name);
                    if (
                        output.exiting &&
                        (exitAnimation === undefined || !exitAnimation.isDone())
                    ) {
                        const place = info.global;
                        // Use the global place since it's now parent-less.
                        const newInfo = {
                            output,
                            global: place,
                            local: place,
                            width: info.width,
                            height: info.height,
                            rotation: info.rotation,
                            context: info.context,
                            parents: [this.stage],
                        };
                        // Add to the exiting list for the stage view to render.
                        exiting.set(name, newInfo);
                        // Remember exit info
                        this.exitedInfo.set(name, newInfo);
                    }
                }
            }
        }

        // Remember the places, so that exiting phrases after the next change have them above.
        this.priorScene = this.scene;
        this.scene = newScene;

        // Remember a mapping between Place values and outputs so that Motion can
        // map back to the outputs it created Places for, and update their corresponding Bodies.
        this.outputByPlace = new Map();
        for (const [, output] of this.scene) {
            if (output.output.place) {
                const outputs =
                    this.outputByPlace.get(output.output.place.value) ?? [];
                this.outputByPlace.set(output.output.place.value, [
                    ...outputs,
                    output.output,
                ]);
            }
        }

        // Sync this scene with the Matter engine.
        this.physics.sync(this.stage, this.scene, exiting);

        // Return the layout for rendering.
        return {
            entered,
            present,
            moved,
            exiting,
            // We pass back an animation function so that the view can start animating once it's refreshed
            // DOM elements. This way the animation handlers can assume DOM elements are ready for animation.
            animate: () => {
                if (this.live) this.animate(present, entered, moved, exiting);
            },
        };
    }

    /**
     * Given a list of entered, moved, and exited named output,
     * update the active animations. Returns the set of immediate exits for
     * deletion.
     */
    animate(
        present: Map<OutputName, Output>,
        entered: Map<OutputName, Output>,
        moved: Map<
            OutputName,
            {
                output: Output;
                prior: Orientation;
                present: Orientation;
            }
        >,
        exited: Map<OutputName, OutputInfo>,
    ): Set<OutputName> {
        if (this.stopped) return new Set();

        function updateOutput(
            animator: Animator,
            name: OutputName,
            output: Output,
        ) {
            const animation = animator.animations.get(name);
            const info = animator.scene.get(name);
            if (info) {
                if (animation) {
                    animation.update(output, info?.context, entered.has(name));
                }
                // If this is animated and its not in the list of names that finished exiting recently
                else if (output.isAnimated()) {
                    const animation = new OutputAnimation(
                        animator,
                        output,
                        info.context,
                        entered.has(name),
                    );
                    animator.animations.set(name, animation);
                }
            }
            // Otherwise, there must not be any animation on this name,
            // because otherwise we would have created an animation.
        }

        // Update the animations of all present output, potentially
        // ending and starting animations.
        for (const [name, output] of present) {
            updateOutput(this, name, output);
        }

        // Update the animations of all exiting output, potentially
        // ending and starting animations.
        for (const [name, output] of exited) {
            updateOutput(this, name, output.output);
        }

        // Trigger moves.
        for (const [name, change] of moved) {
            const animation = this.animations.get(name);
            if (animation) animation.move(change.prior, change.present);
        }

        // Trigger exit animations if they're not already running, keeping track of immediate exits.
        const done = new Set<OutputName>();
        for (const [name] of exited) {
            const animation = this.animations.get(name);
            // If we have an animation record for this and it's not exiting or done, trigger exit
            if (
                animation &&
                animation.state !== AnimationState.Exiting &&
                animation.state !== AnimationState.Done
            ) {
                animation.exit();
                // If it's already done (for a variety of reasons), end it.
                if (animation.isDone()) this.cleanupAnimation(animation);
            }
        }
        return done;
    }

    stop() {
        this.stopped = true;
        this.animations.forEach((animation) => animation.done());

        this.physics.stop();
    }

    /** The exit animation is complete, so we remove it from animations, scenes, and notify listeners the exit callback */
    cleanupAnimation(animation: OutputAnimation) {
        // Don't clean up if the animation hasn't exited yet. (Scene can force an exit animation);
        if (this.exitedInfo.has(animation.name)) {
            const name = animation.output.getName();
            this.animations.delete(name);
            this.exit(name);
        }
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

    updatedAnimationState(animation: OutputAnimation) {
        // Notify any scene streams about the updated animations
        const scenes = this.evaluator.getBasisStreamsOfType(Scene);
        for (const sc of scenes) sc.handleAnimationStateChange(animation);
    }

    // A top down layout algorithm that places groups first, then their subgroups, and uses the
    // ancestor list to compute global places for each group.
    layout(
        output: Output,
        parents: Output[],
        outputInfo: Map<OutputName, OutputInfo>,
        context: RenderContext,
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
        // Get the layout of the output
        const layout = output.getLayout(context);
        // Update the info's width and height
        if (info) {
            info.width = layout.width;
            info.height = layout.height;
        }

        // Get the places of each of this group's subgroups.
        for (const [subgroup, place] of layout.places) {
            // Set the place of this subgroup, offseting it by the parent's position to keep it in global coordinates.
            outputInfo.set(subgroup.getName(), {
                output: subgroup,
                local: place,
                global: parentPlace ? place.offset(parentPlace) : place,
                rotation: info?.rotation,
                // These dimensions will be set in the recursive call below.
                width: 0,
                height: 0,
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
        secondsElapsed: number,
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

    getOutputByPlace(value: Value) {
        return this.outputByPlace.get(value);
    }
}
