import type Project from '../models/Project';
import type LanguageCode from '../translation/LanguageCode';
import type TypeOutput from './TypeOutput';
import type Place from './Place';
import { createPlace } from './Place';
import type { RenderContext } from './RenderContext';
import type Verse from './Verse';
import OutputAnimation from './OutputAnimation';
import type Transition from './Transition';
import type Node from '@nodes/Node';
import { DefaultFont } from './Verse';

export type OutputName = string;

/**
 * Derived state of the previous and current Verses.
 * It's responsible for determining what is visible, triggering layout,
 * preparing groups for rendering, and triggering transitions and animations
 * when things enter, move, and exit. It is not itself responsible for animating;
 * that is the job of the Animator. It relies on the project to be updated
 * any time the project reevaluates.
 * */
export default class Stage {
    readonly project: Project;

    /** The current verse being displayed */
    verse: Verse | undefined = undefined;

    /** True if the stage is animated and interactive */
    live: boolean = true;

    /** The current languages being displayed */
    languages: LanguageCode[] = [];

    /** The current fonts that are loaded */
    fontsLoaded: Set<string> = new Set();

    /** The current viewport size from the verse */
    viewportWidth: number = 0;
    viewportHeight: number = 0;

    /** The current focus from the verse. */
    focus: Place;

    /** The previous and current places where groups are at */
    globalPlaces = new Map<TypeOutput, Place>();
    localPlaces = new Map<TypeOutput, Place>();
    priorGlobalPlaces = new Map<OutputName, Place>();
    priorLocalPlaces = new Map<OutputName, Place>();

    /** The parents of groups */
    parentsByGroup = new Map<TypeOutput, TypeOutput[]>();

    /** Currently and previously present groups. */
    present = new Map<OutputName, TypeOutput>();
    previouslyPresent = new Map<OutputName, TypeOutput>();

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

    constructor(
        project: Project,
        exit: (name: OutputName) => void,
        tick: (nodes: Set<Node>) => void
    ) {
        this.project = project;
        this.exit = exit;
        this.tick = tick;

        // Initialize unintialized defaults.
        this.focus = createPlace(this.project.evaluator, 0, 0, -12);
    }

    /**
     * When any of the following inputs change, update the stage accordingly so that the
     * rendered screen reflects it.
     */
    update(
        verse: Verse,
        live: boolean,
        languages: LanguageCode[],
        fonts: Set<string>,
        focus: Place,
        width: number,
        height: number
    ) {
        this.verse = verse;
        this.live = live;
        this.languages = languages;
        this.fontsLoaded = fonts;
        this.focus = focus;
        this.viewportWidth = width;
        this.viewportHeight = height;

        // Create sets of who entered, exited, and present output by their name.
        const entered = new Map<OutputName, TypeOutput>();
        const moved = new Map<
            OutputName,
            { output: TypeOutput; prior: Place; present: Place }
        >();
        const exited = new Map<OutputName, TypeOutput>();
        const present = new Map<OutputName, TypeOutput>();

        // Remember who was previously present for the future.
        this.previouslyPresent = this.present;

        // Clear the present and visible lists.
        this.present = new Map();

        // Reset the parents.
        this.parentsByGroup.clear();

        // Compute places for all of the groups in the verse.
        const { global, local } = this.layout(
            this.verse,
            [],
            new Map<TypeOutput, Place>(),
            new Map<TypeOutput, Place>(),
            this.getRenderContext()
        );

        const newPriorGlobalPlaces: Map<OutputName, Place> = new Map();
        const newPriorLocalPlaces: Map<OutputName, Place> = new Map();

        // Based on the places, figure out which output is present and visible.
        for (const [group, place] of local) {
            // Was this phrase not previously present? Add to the entered set.
            const name = group.getName();
            if (!this.previouslyPresent.has(name)) {
                entered.set(name, group);
            }

            // Add this name and phrase to the present sets.
            present.set(name, group);
            this.present.set(name, group);

            // Did the place change? Note the move.
            const priorLocalPlace = this.priorLocalPlaces.get(name);
            if (
                priorLocalPlace &&
                (!priorLocalPlace.x.equals(place.x) ||
                    !priorLocalPlace.y.equals(place.y) ||
                    !priorLocalPlace.z.equals(place.z) ||
                    !priorLocalPlace.rotation.equals(place.rotation))
            ) {
                moved.set(name, {
                    output: group,
                    prior: priorLocalPlace,
                    present: place,
                });
            }

            const globalPlace = global.get(group);

            if (globalPlace) newPriorGlobalPlaces.set(name, globalPlace);
            newPriorLocalPlaces.set(name, place);
        }

        // A mapping from exiting groups to where they previously were.
        const exiting = new Map<
            OutputName,
            { output: TypeOutput; place: Place }
        >();

        // Now that we have a list of everyone present, remove everyone that was present that is no longer, and note that they exited.
        for (const [name, output] of this.previouslyPresent) {
            if (!present.has(name)) {
                // If the phrase has an exit squence, then add it to the phrases to keep rendering
                // and remember it's current global place, so we can render it there.
                if (output.exit) {
                    exited.set(name, output);
                    const place = this.priorGlobalPlaces.get(name);
                    if (place) {
                        // We add the exiting output to the list so that the VerseView can render it until it's animation is done.
                        if (place.z.sub(this.focus.z).greaterThan(0)) {
                            exiting.set(output.getName(), { output, place });
                            global.set(output, place);
                            this.parentsByGroup.set(output, [this.verse]);
                        }
                    }
                }
            }
        }

        // Remember the places, so that exiting phrases after the next change have them above.
        this.priorLocalPlaces = newPriorLocalPlaces;
        this.priorGlobalPlaces = newPriorGlobalPlaces;
        this.globalPlaces = global;
        this.localPlaces = local;

        // Return the layout for rendering.
        return {
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
            { output: TypeOutput; prior: Place; present: Place }
        >,
        exited: Map<OutputName, TypeOutput>
    ): Set<OutputName> {
        // Update the phrase of all present and exited animations, potentially
        // ending and starting animations.
        for (const [name, output] of present) {
            const animation = this.animations.get(name);
            if (animation) {
                animation.update(output, entered.has(name));
            } else if (output.isAnimated()) {
                const animation = new OutputAnimation(
                    this,
                    output,
                    entered.has(name)
                );
                this.animations.set(name, animation);
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
                if (animation.done()) this.ended(animation);
            }
        }
        return done;
    }

    stop() {
        this.animations.forEach((animation) => animation.end());
    }

    ended(animation: OutputAnimation) {
        const name = animation.output.getName();
        this.animations.delete(name);
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

    getRenderContext(): RenderContext {
        return {
            font: this.verse?.font ?? DefaultFont,
            languages: this.languages,
            fonts: this.fontsLoaded,
        };
    }

    // A top down layout algorithm that places groups first, then their subgroups, and uses the
    // ancestor list to compute global places for each group.
    layout(
        group: TypeOutput,
        parents: TypeOutput[],
        global: Map<TypeOutput, Place>,
        local: Map<TypeOutput, Place>,
        context: RenderContext
    ) {
        // Add this group to the parent stack.
        parents.unshift(group);
        // Get this group's place, so we can offset its subgroups.
        const parentPlace = global.get(group);
        // Get the places of each of this group's subgroups.
        for (const [subgroup, place] of group.getPlaces(context)) {
            this.parentsByGroup.set(subgroup, parents.slice());
            local.set(subgroup, place);
            // Set the place of this subgroup, offseting it by the parent's position to keep it in global coordinates.
            global.set(
                subgroup,
                parentPlace ? place.offset(parentPlace) : place
            );
            // Now that this subgroup's position is set, layout the subgroup's subgroups.
            this.layout(subgroup, parents, global, local, context);
        }
        // Remove this group from the top of the parent stack.
        parents.shift();

        return { global, local };
    }
}
