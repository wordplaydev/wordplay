import Decimal from 'decimal.js';
import type Project from '../models/Project';
import type LanguageCode from '@translation/LanguageCode';
import Measurement from '@runtime/Measurement';
import Color from './Color';
import type { RenderContext } from './Group';
import type Group from './Group';
import type MoveState from './MoveState';
import Phrase from './Phrase';
import phraseToCSS from './phraseToCSS';
import Place from './Place';
import type Pose from './Pose';
import type { SequenceKind } from './Sequence';
import type Sequence from './Sequence';
import TextLang from './TextLang';
import type Verse from './Verse';

export type PhraseName = string;

type Animation = {
    kind: 'entry' | 'between' | 'during' | 'exit';
    currentPose: Pose;
    currentPoseStartTime: number | undefined;
    iterations: Map<Sequence, number>;
    moves: Record<string, MoveState<SupportedPropertyType>>;
};

const SupportedProperty: (keyof Pose)[] = [
    'text',
    'size',
    'font',
    'color',
    'opacity',
    'place',
    'offset',
    'rotation',
    'scalex',
    'scaley',
];
type SupportedPropertyType = number | string | Color | Place;

export default Animation;

export class Animations {
    project: Project;
    verse: Verse | undefined;
    languages: LanguageCode[];
    fontsLoaded: Set<string>;

    priorPlaces = new Map<Group, Place>();

    readonly animations: Map<PhraseName, Animation> = new Map();

    present: Phrase[] = [];
    visible: Phrase[] = [];
    readonly exiting: Map<Phrase, Place> = new Map();

    previouslyPresent: Set<Phrase> = new Set();

    constructor(
        project: Project,
        verse: Verse | undefined,
        languages: LanguageCode[],
        fonts: Set<string>
    ) {
        this.project = project;
        this.verse = verse;
        this.languages = languages;
        this.fontsLoaded = fonts;
    }

    getCount() {
        return this.animations.size;
    }

    getPhraseByName(name: PhraseName) {
        return (
            this.present.find((p) => p.getName() === name) ??
            Array.from(this.exiting.keys()).find((p) => p.getName() === name)
        );
    }

    layout() {
        const places = new Map<Group, Place>();

        if (this.verse === undefined) return places;

        this.layoutGroup(this.verse, [], places, this.getRenderContext());
        return places;
    }

    // A top down layout algorithm that places groups first, then their subgroups, and uses the
    // ancestor list to compute global places for each group.
    layoutGroup(
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
            this.layoutGroup(subgroup, parents, places, context);
        }
        // Remove this group from the top of the parent stack.
        parents.shift();
    }

    startSequence(phrase: Phrase, sequence: Sequence, kind: SequenceKind) {
        const name = phrase.getName();
        // Get the first pose in the sequence
        const firstPose = sequence.getFirstPose();
        // Only add a sequence for this phrase if there's a first pose.
        if (firstPose && sequence.count > 0) {
            // Set a sequence for this phrase, starting at the first pose.
            const iterations = new Map<Sequence, number>();
            iterations.set(sequence, 1);

            // Reuse the existing animation to reuse any existing pose values.
            let newAnimation = this.animations.get(name);

            if (newAnimation) {
                newAnimation.kind = kind;
                newAnimation.currentPose = firstPose;
                newAnimation.currentPoseStartTime = undefined;
                newAnimation.iterations = iterations;
            }
            // Otherwise, create a new animation.
            else
                newAnimation = {
                    kind: kind,
                    currentPose: firstPose,
                    currentPoseStartTime: undefined,
                    iterations: iterations,
                    moves: {},
                };
            // Save the new animation.
            this.animations.set(phrase.getName(), newAnimation);

            return newAnimation;
        }
        return undefined;
    }

    getRenderContext() {
        const animationsByPhrase = new Map<Phrase, Animation>();
        for (const [name, animation] of this.animations) {
            const phrase = this.getPhraseByName(name);
            if (phrase) animationsByPhrase.set(phrase, animation);
        }

        return {
            font: this.verse?.font ?? '',
            languages: this.languages,
            fonts: this.fontsLoaded,
            animations: animationsByPhrase,
        };
    }

    update(verse: Verse, languages: LanguageCode[], fonts: Set<string>) {
        this.verse = verse;
        this.languages = languages;
        this.fontsLoaded = fonts;

        // Walk the Verse and compute global places for each group.
        // This relies on each phrase and group to be able to size itself independent of its group
        // and then position based on sizes.
        const places = this.layout();

        // Create sets of who entered and exited.
        let enteredNames = new Set<PhraseName>();
        let exitedNames = new Set<PhraseName>();

        // Compute the subset of groups that are phrases to prepare for rendering.
        const namesPresentNow = new Set<PhraseName>();

        // Remember who was previously present for the future.
        this.previouslyPresent = new Set(this.present);

        // Clear the present and visible lists.
        this.present = [];
        this.visible = [];

        // Figure out which phrases are present and visible.
        for (const [phrase, place] of places) {
            // Exclude those that are behind the focal point on the z-axis, since they're invisible anyway.
            if (phrase instanceof Phrase) {
                // Is this phrase new? Add to the entered set and mark it present.
                const name = phrase.getName();
                if (
                    !Array.from(this.previouslyPresent).some(
                        (p) => p.getName() === name
                    )
                )
                    enteredNames.add(name);

                // Note that this phrase is now present.
                namesPresentNow.add(name);

                // Keep a list of all phrases present, even if not rendered.
                this.present.push(phrase);

                // If it's in front of the focus, it's visible.
                if (place.z.sub(verse.focus.z).greaterThan(0))
                    this.visible.push(phrase);
            }
        }

        // Now that we have a list of everyone present, remove everyone that was present that is no longer, and note that they exited.
        for (const phrase of this.previouslyPresent) {
            const name = phrase.getName();
            if (!namesPresentNow.has(name)) {
                exitedNames.add(name);
                // If the phrase has an exit squence, then add it to the phrases to keep rendering
                // and remember it's current place.
                if (phrase.exit) {
                    const place = this.priorPlaces.get(phrase);
                    if (place) this.exiting.set(phrase, place);
                }
            }
        }

        // Finally, sort the phrases by distance from the focal point.
        this.visible.sort((a, b) => {
            const aPlace = places.get(a);
            const bPlace = places.get(b);
            return aPlace === undefined
                ? -1
                : bPlace == undefined
                ? 1
                : aPlace.z
                      .sub(verse.focus.z)
                      .sub(bPlace.z.sub(verse.focus.z))
                      .toNumber();
        });

        // Find all of the phrases that specify a sequence.
        for (const phrase of [...this.visible, ...this.exiting.keys()]) {
            const name = phrase.getName();
            // Is there any entry sequence, but not yet an animation for this phrase?
            let sequence: Sequence | undefined = undefined;
            let kind: 'entry' | 'between' | 'during' | 'exit' | undefined =
                undefined;

            // If it just entered, start an entry sequence if it has one, and if it doesn't, start a during if it has one.
            if (enteredNames.has(name)) {
                if (phrase.entry) {
                    sequence = phrase.entry.asSequence();
                    kind = 'entry';
                } else if (phrase.during) {
                    sequence = phrase.during.asSequence();
                    kind = 'during';
                }
            }
            // If it just exited, start an exit sequence if it has one, and stop the during.
            else if (exitedNames.has(name)) {
                if (phrase.exit) {
                    sequence = phrase.exit.asSequence();
                    kind = 'exit';
                }
                // Otherwise, stop any active animations.
                else {
                    this.animations.delete(name);
                }
            }
            // Otherwise, if it's not in the middle of exiting, start a during or tween.
            // This happens after an entry is done, or after a reaction.
            else if (this.animations.get(name)?.kind !== 'exit') {
                // If there's a during, run that.
                if (phrase.during) {
                    sequence = phrase.during.asSequence();
                    kind = 'during';
                }
                // Otherwise, make a pose sequence that iterates once from the current to the new value.
                else if (phrase.between) {
                    sequence = phrase.between.asSequence();
                    kind = 'between';
                }
            }

            if (sequence && kind) this.startSequence(phrase, sequence, kind);
        }

        if (this.getCount() > 0)
            window.requestAnimationFrame((time) => this.animate(time));

        // Remember the places, since existing phrases need them after removal.
        this.priorPlaces = places;

        // Return the layout for rendering.
        return { places, visible: this.visible, exiting: this.exiting };
    }

    getStartValue(
        animation: Animation,
        phrase: Phrase,
        sequence: Sequence,
        property: keyof Pose
    ): SupportedPropertyType | undefined {
        if (!SupportedProperty.includes(property)) return undefined;

        // If there's a currently animated value, we always default to that for any animation, since that's what's visible on screen.
        // This ensures smooth transitions.
        // Always start from the latest animated value if there is one, to ensure continuity from any interrupted animation.
        if (animation.moves[property] !== undefined)
            return animation.moves[property].value;

        // If we don't have one, and this is a tween, see if we have a previously rendered phrase to get a start value.
        if (animation.kind === 'between') {
            const previousPhrase = Array.from(this.previouslyPresent).find(
                (p) => p.getName() === phrase.getName()
            );
            const previousValue = previousPhrase
                ? previousPhrase[property as keyof Phrase]
                : undefined;
            if (previousValue) return previousValue as SupportedPropertyType;
        }

        // If we don't have one, and this is an exit, use the phrase's current value.
        if (animation.kind === 'exit')
            return phrase[property as keyof Phrase] as SupportedPropertyType;

        // If we're on the animation's first pose, use it's first value.
        if (sequence.getFirstPose() === animation.currentPose) {
            const value = animation.currentPose[property];
            if (value) return value as SupportedPropertyType;
        }
        // If we still don't have one and we're on the next pose, use the next pose that specifies a value.
        const nextPoseWithValue = sequence.getNextPoseThat(
            animation.currentPose,
            (pose) => pose[property] !== undefined
        );
        const nextValue = nextPoseWithValue
            ? nextPoseWithValue[property]
            : undefined;
        if (nextPoseWithValue) return nextValue as SupportedPropertyType;

        // If we still don't have a value, default to the phrase's current value.
        return phrase[property as keyof Phrase] as SupportedPropertyType;
    }

    getEndValue(
        animation: Animation,
        phrase: Phrase,
        sequence: Sequence,
        property: keyof Pose
    ): SupportedPropertyType | undefined {
        if (!SupportedProperty.includes(property)) return undefined;

        // If this is the first pose, use it's size
        if (
            animation.kind === 'exit' &&
            sequence.getFirstPose() === animation.currentPose
        ) {
            const firstPoseValue = animation.currentPose[property];
            if (firstPoseValue) return firstPoseValue as SupportedPropertyType;
        }
        // Next value in the sequence
        const nextPoseWithValue = sequence.getNextPoseThat(
            animation.currentPose,
            (pose) => pose.size !== undefined
        );
        const nextPoseValue = nextPoseWithValue
            ? nextPoseWithValue[property]
            : undefined;
        if (nextPoseValue) return nextPoseValue as SupportedPropertyType;

        // If the sequence will loop, choose the first pose's size
        if (phrase.willLoop(animation)) {
            const firstPose = sequence
                .getSequenceOfPose(animation.currentPose)
                ?.getFirstPose();
            const firstPoseValue =
                firstPose !== undefined ? firstPose[property] : undefined;
            if (firstPoseValue) return firstPoseValue as SupportedPropertyType;
        }

        // If there isn't one, the phrase's current size.
        return phrase[property as keyof Phrase] as SupportedPropertyType;
    }

    getNextValue(start: number, end: number, progress: number) {
        return start + progress * (end - start);
    }

    animate(currentTime: number) {
        const completed: PhraseName[] = [];

        // For all of the active sequences, make progress on their current pose's moves, and advance to next poses.
        for (let [name, animation] of this.animations) {
            // Find the current Phrase corresponding to this name.
            const phrase = this.getPhraseByName(name);

            // Skip this animation if we couldn't find it, it must no longer be in the verse.
            // Mark the animation for completion.
            if (phrase === undefined) {
                completed.push(name);
                continue;
            }

            // Find the current Sequence corresponding to this name and kind.
            let sequence = phrase.getSequence(animation.kind);

            // If there's no longer a sequence on this phrase, but we did find a phrase,
            // see if it has a during sequence. If it doesn't, mark it completed. Otherwise,
            // resume it's during, whatever that might be.
            if (sequence === undefined) {
                // If the phrase has a during and wasn't animating an exit
                if (phrase.during && animation.kind !== 'exit') {
                    sequence = phrase.during.asSequence();
                    const newAnimation = this.startSequence(
                        phrase,
                        sequence,
                        'during'
                    );
                    if (newAnimation) animation = newAnimation;
                    else continue;
                } else {
                    completed.push(name);
                    continue;
                }
            }

            // If we haven't started the sequence yet, start it!
            if (animation.currentPoseStartTime === undefined) {
                // Note the start time so we can determine when the pose is done.
                animation.currentPoseStartTime = currentTime;

                // Start values are:
                // 1) The most recent animated value
                // 2) If not that, the next value of the property in the entry sequence
                // 3) If not that, phrase's current property value

                // End values are:
                // 1) The next value of the property in the exit sequence
                // 2) If not that, the phrase's current property value

                // Iterate through all properties to find start and stop values for the move.
                const properties = SupportedProperty;
                for (const property of properties) {
                    if (
                        animation.currentPose[property] !== undefined ||
                        animation.kind === 'between'
                    ) {
                        // Choose a suitable start and end value for the animation.
                        let start = this.getStartValue(
                            animation,
                            phrase,
                            sequence,
                            property
                        );
                        let end = this.getEndValue(
                            animation,
                            phrase,
                            sequence,
                            property
                        );

                        // If the start or end value is a list of Text, choose based on current langauge.
                        if (
                            Array.isArray(start) &&
                            start.every((t) => t instanceof TextLang)
                        )
                            start = start[0].text;
                        if (
                            Array.isArray(end) &&
                            end.every((t) => t instanceof TextLang)
                        )
                            end = end[0].text;

                        // If we managed to find values, animate them!
                        if (start !== undefined && end !== undefined)
                            animation.moves[property] = {
                                start: start,
                                end: end,
                                // Update this to account for different kinds of sequences.
                                value: start,
                            };
                    }
                }
            }
            // If we have started them, advance them, and stop them if they're done.
            else if (
                animation.currentPoseStartTime !== undefined &&
                animation.moves !== undefined
            ) {
                // Trim the percent to 100
                const percent = Math.min(
                    1,
                    (currentTime - animation.currentPoseStartTime) /
                        (1000 * animation.currentPose.duration)
                );

                // Convert percent to progress with the pose's style (i.e., easing function)
                const style = animation.currentPose.style;
                const value = this.project.evaluator.evaluateFunction(
                    this.project.main,
                    style,
                    [
                        new Measurement(
                            animation.currentPose.value.creator,
                            percent
                        ),
                    ]
                );

                // If the style function couldn't be evaluated or didn't produce a measurement, just default to 100% progress.
                // Assume the editor will show that there are conflicts on the style function.
                const progress =
                    value === undefined || !(value instanceof Measurement)
                        ? 1
                        : value.toNumber();

                // Move toward the end value of each move.
                for (const property of Object.keys(animation.moves)) {
                    const move = animation.moves[property];

                    let nextValue;

                    if (
                        typeof move.start === 'number' &&
                        typeof move.end === 'number'
                    )
                        nextValue = this.getNextValue(
                            move.start,
                            move.end,
                            progress
                        );
                    else if (
                        move.start instanceof Place &&
                        move.end instanceof Place
                    ) {
                        nextValue = new Place(
                            phrase.value,
                            new Decimal(
                                this.getNextValue(
                                    move.start.x.toNumber(),
                                    move.end.x.toNumber(),
                                    progress
                                )
                            ),
                            new Decimal(
                                this.getNextValue(
                                    move.start.y.toNumber(),
                                    move.end.y.toNumber(),
                                    progress
                                )
                            ),
                            new Decimal(
                                this.getNextValue(
                                    move.start.z.toNumber(),
                                    move.end.z.toNumber(),
                                    progress
                                )
                            )
                        );
                    } else if (
                        move.start instanceof Color &&
                        move.end instanceof Color
                    ) {
                        nextValue = new Color(
                            phrase.value,
                            new Decimal(
                                this.getNextValue(
                                    move.start.lightness.toNumber(),
                                    move.end.lightness.toNumber(),
                                    progress
                                )
                            ),
                            new Decimal(
                                this.getNextValue(
                                    move.start.chroma.toNumber(),
                                    move.end.chroma.toNumber(),
                                    progress
                                )
                            ),
                            new Decimal(
                                this.getNextValue(
                                    move.start.hue.toNumber(),
                                    move.end.hue.toNumber(),
                                    progress
                                )
                            )
                        );
                    } else if (
                        property === 'text' &&
                        typeof move.start === 'string' &&
                        typeof move.end === 'string'
                    ) {
                        const steps = getTextTransition(move.start, move.end);
                        // Bound to the array in case the easing goes out of bounds.
                        const index = Math.max(
                            0,
                            Math.min(
                                Math.round(
                                    this.getNextValue(0, steps.length, progress)
                                ),
                                steps.length - 1
                            )
                        );
                        nextValue = steps[index];
                    }

                    if (nextValue !== undefined) move.value = nextValue;
                }

                // If this pose is done, start the next pose in the sequence, or if there isn't one, end the sequence.
                if (percent === 1) {
                    const currentSequence = sequence.getSequenceOfPose(
                        animation.currentPose
                    );
                    const nextPoseOverall = sequence.getNextPose(
                        animation.currentPose
                    );

                    // If this specific sequence is over, but has more iterations, do another cycle.
                    if (phrase.willLoop(animation)) {
                        const firstInCurrent = currentSequence?.getFirstPose();
                        if (currentSequence && firstInCurrent) {
                            animation.iterations.set(
                                currentSequence,
                                1 +
                                    (animation.iterations.get(
                                        currentSequence
                                    ) ?? 0)
                            );
                            animation.currentPose = firstInCurrent;
                            animation.currentPoseStartTime = undefined;
                        }
                    }
                    // If there's another pose overall, do that one.
                    else if (nextPoseOverall) {
                        animation.currentPose = nextPoseOverall;
                        animation.currentPoseStartTime = undefined;
                        const newSequence = sequence.getSequenceOfPose(
                            animation.currentPose
                        );
                        if (
                            newSequence &&
                            !animation.iterations.has(newSequence)
                        )
                            animation.iterations.set(newSequence, 1);
                    }
                    // Otherwise, this sequence is done.
                    else completed.push(name);
                }
            }
        }

        // Now that we've updated all of the sequences, update the positions of all phrases involved in them using the new values.
        // This is because text, font, offset,Animation affect layout. We create a mapping to moves,
        // pass it to the render context, then rely on Phrases to use the moves values instead of the canonical values when present.
        const places = this.layout();

        // Render each phrase with the pose.
        for (const [name, animation] of this.animations)
            this.renderPhrase(name, animation, places);

        // Clean up all completed sequences.
        for (const name of completed) {
            const animation = this.animations.get(name);
            if (animation) {
                // Delete it from the animation list.
                this.animations.delete(name);

                // Find the current phrase.
                const phrase = this.getPhraseByName(name);

                if (phrase) {
                    // If it was an entry, see if there was a during
                    if (animation.kind === 'entry') {
                        if (phrase && phrase.during)
                            this.startSequence(
                                phrase,
                                phrase.during.asSequence(),
                                'during'
                            );
                    }
                    // If it was an exit, remove it from the belatedly rendered phrases.
                    else if (animation.kind === 'exit') {
                        this.exiting.delete(phrase);
                    }
                }
            }
        }

        // Animate another frame if there are any remaining active sequences and we're still playing.
        if (this.getCount() > 0) {
            if (this.project.evaluator.isPlaying())
                window.requestAnimationFrame((time) => this.animate(time));
            // If we're not playing, clean up exiting phrases so there's nothing left around.
            else this.clear();
        }

        // Notify the evaluator's listeners that we're done animating.
        this.project.evaluator.broadcast();
    }

    renderPhrase(
        name: PhraseName,
        animation: Animation,
        places: Map<Group, Place>
    ) {
        if (this.verse === undefined) return;

        // Find the current Phrase corresponding to this name.
        const phrase = this.getPhraseByName(name);

        if (phrase === undefined) return;

        // Find the view to style
        const view = document.getElementById(`phrase-${name}`);
        if (view) {
            // Find the moves for each property, defaulting to the phrase's current value.
            const renderedPhrase = new Phrase(
                phrase.value,
                animation.moves.text?.value === undefined
                    ? phrase.text
                    : [
                          new TextLang(
                              phrase.value,
                              animation.moves.text.value as string
                          ),
                      ],
                (animation.moves.size?.value as number) ?? phrase.size,
                (animation.moves.font?.value as string) ?? phrase.font,
                (animation.moves.color?.value as Color) ?? phrase.color,
                (animation.moves.opacity?.value as number) ?? phrase.opacity,
                (animation.moves.place?.value as Place) ?? phrase.place,
                (animation.moves.offset?.value as Place) ?? phrase.offset,
                (animation.moves.rotation?.value as number) ?? phrase.rotation,
                (animation.moves.scalex?.value as number) ?? phrase.scalex,
                (animation.moves.scaley?.value as number) ?? phrase.scaley
            );

            // Determine the render location (and if is an exiting phrase, fall back to it's last position)
            const place = places.get(phrase) ?? this.exiting.get(phrase);

            // Apply each style, as the PhraseView does, by creating a temporary Phrase.
            if (place) {
                view.setAttribute(
                    'style',
                    phraseToCSS(
                        renderedPhrase,
                        renderedPhrase.place ?? place,
                        this.verse.focus
                    )
                );
                view.innerHTML = renderedPhrase.getDescription(this.languages);
            }
        }
    }

    /** Clear all state (usually in preparation to show a different Evaluator state) */
    clear() {
        this.priorPlaces.clear();
        this.animations.clear();
        this.present.length = 0;
        this.visible.length = 0;
        this.exiting.clear();
        this.previouslyPresent.clear();
    }
}

export function getTextTransition(start: string, end: string): string[] {
    const steps: string[] = [start];

    // Backspace until reaching a common prefix
    let state = start;
    while (!end.startsWith(state)) {
        state = state.substring(0, state.length - 1);
        steps.push(state);
    }

    // Insert until reaching the end
    while (state !== end) {
        state = state + end.charAt(state.length);
        steps.push(state);
    }

    return steps;
}
