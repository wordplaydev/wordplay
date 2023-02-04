import type Project from '../models/Project';
import type LanguageCode from '../translation/LanguageCode';
import type Group from './Group';
import Phrase from './Phrase';
import type Place from './Place';
import { createPlace } from './Place';
import type { RenderContext } from './RenderContext';
import type Verse from './Verse';
import OutputAnimation from './OutputAnimation';
import type Transition from './Transition';
import type Node from '@nodes/Node';

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

    /** The current HTML element in which the stage is being rendered */
    element: HTMLElement | null = null;

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
    places = new Map<Group, Place>();
    priorPlaces = new Map<OutputName, Place>();

    /** Currently and previously present groups. */
    present = new Map<OutputName, Phrase>();
    previouslyPresent = new Map<OutputName, Phrase>();

    /** Subset of groups that are visible based on the verse focus. */
    visible: Phrase[] = [];

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
        element: HTMLElement | null,
        languages: LanguageCode[],
        fonts: Set<string>,
        focus: Place,
        width: number,
        height: number
    ) {
        this.verse = verse;
        this.live = live;
        this.element = element;
        this.languages = languages;
        this.fontsLoaded = fonts;
        this.focus = focus;
        this.viewportWidth = width;
        this.viewportHeight = height;

        // Create sets of who entered, exited, and present output by their name.
        const entered = new Map<OutputName, Phrase>();
        const moved = new Map<
            OutputName,
            { output: Phrase; prior: Place; present: Place }
        >();
        const exited = new Map<OutputName, Phrase>();
        const present = new Map<OutputName, Phrase>();

        // Remember who was previously present for the future.
        this.previouslyPresent = this.present;

        // Clear the present and visible lists.
        this.present = new Map();
        this.visible = [];

        // Compute places for all of the groups in the verse.
        const newPlaces = this.layout(
            this.verse,
            [],
            new Map<Group, Place>(),
            this.getRenderContext()
        );

        const newPriorPlaces: Map<OutputName, Place> = new Map();

        // Based on the places, figure out which phrases are present and visible.
        for (const [phrase, place] of newPlaces) {
            // TODO Eventually need to generalize this to groups.
            if (phrase instanceof Phrase) {
                // Was this phrase not previously present? Add to the entered set.
                const name = phrase.getName();
                if (!this.previouslyPresent.has(name)) {
                    entered.set(name, phrase);
                }

                // Add this name and phrase to the present sets.
                present.set(name, phrase);
                this.present.set(name, phrase);

                // If it's in front of the focus, the phrase is visible (and should be rendered).
                if (place.z.sub(this.focus.z).greaterThan(0))
                    this.visible.push(phrase);

                // Did the place change? Note the move.
                const priorPlace = this.priorPlaces.get(name);
                if (
                    priorPlace &&
                    (!priorPlace.x.equals(place.x) ||
                        !priorPlace.y.equals(place.y) ||
                        !priorPlace.z.equals(place.z) ||
                        !priorPlace.rotation.equals(place.rotation))
                ) {
                    moved.set(name, {
                        output: phrase,
                        prior: priorPlace,
                        present: place,
                    });
                }

                newPriorPlaces.set(name, place);
            }
        }

        // Now that we have a list of everyone present, remove everyone that was present that is no longer, and note that they exited.
        for (const [name, phrase] of this.previouslyPresent) {
            if (!present.has(name)) {
                // If the phrase has an exit squence, then add it to the phrases to keep rendering
                // and remember it's current place.
                if (phrase.exit) {
                    exited.set(name, phrase);
                    const place = this.priorPlaces.get(name);
                    if (place) {
                        newPlaces.set(phrase, place);
                        // We add the exiting output to the visible output so that it stays rendered until the exit is done.
                        if (place.z.sub(this.focus.z).greaterThan(0)) {
                            this.visible.push(phrase);
                            newPlaces.set(phrase, place);
                        }
                    }
                }
            }
        }

        // Remember the places, so that exiting phrases after the next change have them above.
        this.priorPlaces = newPriorPlaces;
        this.places = newPlaces;

        // Finally, sort the phrases by distance from the focal point.
        this.visible.sort((a, b) => {
            const aPlace = newPlaces.get(a);
            const bPlace = newPlaces.get(b);
            return aPlace === undefined
                ? -1
                : bPlace == undefined
                ? 1
                : bPlace.z
                      .sub(this.focus.z)
                      .sub(aPlace.z.sub(this.focus.z))
                      .toNumber();
        });

        // Notify the animator of present, entered, moved, and exited output so that it
        // can decide what to animate. We wait until we have an element so the DOM elements
        // are available for animating.
        if (this.live) this.animate(present, entered, moved, exited);

        // Return the layout for rendering.
        return {
            places: this.places,
            visible: this.visible,
        };
    }

    /**
     * Given a list of entered, moved, and exited named output,
     * update the active animations. Returns the set of immediate exits for
     * deletion.
     */
    animate(
        present: Map<OutputName, Phrase>,
        entered: Map<OutputName, Phrase>,
        moved: Map<
            OutputName,
            { output: Phrase; prior: Place; present: Place }
        >,
        exited: Map<OutputName, Phrase>
    ): Set<OutputName> {
        // Update the phrase of all present and exited animations, potentially
        // ending and starting animations.
        for (const [name, phrase] of present) {
            const animation = this.animations.get(name);
            if (animation) {
                animation.update(phrase, entered.has(name));
            } else if (phrase.isAnimated()) {
                const animation = new OutputAnimation(
                    this,
                    phrase,
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

        // Trigger exits, keeping track of immediate exits.
        const done = new Set<OutputName>();
        for (const [name] of exited) {
            const animation = this.animations.get(name);
            if (animation) {
                animation.exit();
                if (animation.done()) done.add(name);
            }
        }
        return done;
    }

    stop() {
        this.animations.forEach((animation) => animation.end());
    }

    getElement() {
        return this.element;
    }

    ended(animation: OutputAnimation) {
        const name = animation.phrase.getName();
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
            font: this.verse?.font ?? '',
            languages: this.languages,
            fonts: this.fontsLoaded,
        };
    }

    // A top down layout algorithm that places groups first, then their subgroups, and uses the
    // ancestor list to compute global places for each group.
    layout(
        group: Group,
        parents: Group[],
        places: Map<Group, Place>,
        context: RenderContext
    ) {
        // Add this group to the parent stack.
        parents.unshift(group);
        // Get this group's place, so we can offset its subgroups.
        const parentPlace = places.get(group);
        // Get the places of each of this group's subgroups.
        for (const [subgroup, place] of group.getPlaces(context)) {
            // Set the place of this subgroup, offseting it by the parent's position to keep it in global coordinates.
            places.set(
                subgroup,
                parentPlace ? place.offset(parentPlace) : place
            );
            // Now that this subgroup's position is set, layout the subgroup's subgroups.
            this.layout(subgroup, parents, places, context);
        }
        // Remove this group from the top of the parent stack.
        parents.shift();

        return places;
    }
}
