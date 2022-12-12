import type LanguageCode from "../nodes/LanguageCode";
import type Color from "./Color";
import type { RenderContext } from "./Group";
import type Group from "./Group";
import type MoveState from "./MoveState";
import Phrase from "./Phrase";
import phraseToCSS from "./phraseToCSS";
import type Place from "./Place";
import type Pose from "./Pose";
import type { SequenceKind } from "./Sequence";
import type Sequence from "./Sequence";
import type TextLang from "./TextLang";
import type Verse from "./Verse";

export type PhraseName = string;

type Animation = {
    kind: "entry" | "between" | "during" | "exit",
    currentPose: Pose
    currentPoseStartTime: number | undefined,
    iterations: Map<Sequence, number>,
    moves: {
        text?: MoveState<TextLang[]>,
        size?: MoveState<number>,
        font?: MoveState<string>,
        color?: MoveState<Color>,
        opacity?: MoveState<number>,
        place?: MoveState<Place>,
        offset?: MoveState<Place>,
        rotation?: MoveState<number>,
        scalex?: MoveState<number>,
        scaley?: MoveState<number>
    }
}

export default Animation;

export class Animations {

    verse: Verse;
    languages: LanguageCode[];
    fontsLoaded: Set<string>;

    priorPlaces = new Map<Group, Place>();

    readonly animations: Map<PhraseName, Animation> = new Map();

    present: Phrase[] = [];
    visible: Phrase[] = [];
    readonly exiting: Map<Phrase, Place> = new Map();

    previouslyPresent: Set<Phrase> = new Set();

    constructor(verse: Verse, languages: LanguageCode[], fonts: Set<string>) {
        this.verse = verse;
        this.languages = languages;
        this.fontsLoaded = fonts;
    }

    getCount() { return this.animations.size; }

    getPhraseByName(name: PhraseName) {
        return this.present.find(p => p.getName() === name) ?? Array.from(this.exiting.keys()).find(p => p.getName() === name);
    }

    layout() {

        const places = new Map<Group, Place>();
        this.layoutGroup(this.verse, [], places, this.getRenderContext());
        return places;

    }

    // A top down layout algorithm that places groups first, then their subgroups, and uses the
    // ancestor list to compute global places for each group.
    layoutGroup(group: Group, parents: Group[], places: Map<Group, Place>, context: RenderContext) {
        // Add this group to the parent stack.
        parents.unshift(group);
        // Get this group's place, so we can offset its subgroups.
        const parentPlace = places.get(group);
        // Get the places of each of this group's subgroups.
        for(const [ subgroup, place ] of group.getPlaces(context)) {
            // Set the place of this subgroup, offseting it by the parent's position to keep it in global coordinates.
            places.set(subgroup, parentPlace ? place.offset(parentPlace) : place);
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
        if(firstPose && sequence.count > 0) {         
            // Set a sequence for this phrase, starting at the first pose.
            const iterations = new Map<Sequence, number>();
            iterations.set(sequence, 1);
    
            // Reuse the existing animation to reuse any existing pose values.
            let newAnimation = this.animations.get(name);
    
            if(newAnimation) {
                newAnimation.kind = kind;
                newAnimation.currentPose = firstPose;
                newAnimation.currentPoseStartTime = undefined;
                newAnimation.iterations = iterations;
            }
            // Otherwise, create a new animation.
            else newAnimation =  {
                kind: kind, 
                currentPose: firstPose, 
                currentPoseStartTime: undefined, 
                iterations: iterations,
                moves: {}
            };
            // Save the new animation.
            this.animations.set(phrase.getName(), newAnimation);
            return newAnimation;
        }
        return undefined;
    
    }

    getRenderContext() {

        const animationsByPhrase = new Map<Phrase, Animation>();
        for(const [ name, animation ] of this.animations) {
            const phrase = this.getPhraseByName(name);
            if(phrase)
                animationsByPhrase.set(phrase, animation);
        }

        return { font: this.verse.font, languages: this.languages, fonts: this.fontsLoaded, animations: animationsByPhrase };

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

        // Clear the present and visible lists.
        this.present = [];
        this.visible = [];

        // Figure out which phrases are present and visible.
        for(const [ phrase, place ] of places) {
            // Exclude those that are behind the focal point on the z-axis, since they're invisible anyway.
            if(phrase instanceof Phrase) {

                // Is this phrase new? Add to the entered set and mark it present.
                const name = phrase.getName();
                if(!(Array.from(this.previouslyPresent)).some(p => p.getName() === name))
                    enteredNames.add(name);
                
                // Note that this phrase is now present.
                namesPresentNow.add(name);

                // Keep a list of all phrases present, even if not rendered.
                this.present.push(phrase);

                // If it's in front of the focus, it's visible.
                if(place.z.sub(verse.focus.z).greaterThan(0))
                    this.visible.push(phrase);
            }
        }

        // Now that we have a list of everyone present, remove everyone that was present that is no longer, and note that they exited.
        for(const phrase of this.previouslyPresent) {
            const name = phrase.getName();
            if(!namesPresentNow.has(name)) {
                this.previouslyPresent.delete(phrase);
                exitedNames.add(name);
                // If the phrase has an exit squence, then add it to the phrases to keep rendering
                // and remember it's current place.
                if(phrase.exit) {
                    const place = this.priorPlaces.get(phrase);
                    if(place)
                        this.exiting.set(phrase, place);
                }
            }
        }

        // Mark everyone now present as previously present for next time.
        this.previouslyPresent = new Set(this.present);

        // Finally, sort the phrases by distance from the focal point.
        this.visible.sort((a, b) => {
            const aPlace = places.get(a);
            const bPlace = places.get(b);
            return aPlace === undefined ? -1 :
                bPlace == undefined ? 1 :
                aPlace.z.sub(verse.focus.z).sub(bPlace.z.sub(verse.focus.z)).toNumber()
        });

        // Find all of the phrases that specify a sequence.
        for(const phrase of [ ... this.visible, ... this.exiting.keys()]) {
            const name = phrase.getName();
            // Is there any entry sequence, but not yet an animation for this phrase?
            let sequence: Sequence | undefined = undefined;
            let kind: "entry" | "between" | "during" | "exit" | undefined = undefined;

            // Does it have an entry and just entered? Start it's entry animation.
            if(phrase.entry && enteredNames.has(name)) {
                // Convert the pose to a sequence if it's not one, since a single pose is basically a sequence of one pose.
                sequence = phrase.entry.asSequence();
                kind = "entry";
            }
            // Does it have an exit?
            else if(phrase.exit && exitedNames.has(name)) {
                sequence = phrase.exit.asSequence();
                kind = "exit";
            }
            // Does it have a during and ian exit isn't being animated?
            else if(phrase.during && this.animations.get(name)?.kind !== "exit") {
                sequence = phrase.during.asSequence();
                kind = "during";
            }

            if(sequence && kind)
                this.startSequence(phrase, sequence, kind);
        }

        if(this.getCount() > 0)
            window.requestAnimationFrame(time => this.animate(time));

        // Remember the places, since existing phrases need them after removal.
        this.priorPlaces = places;

        // Return the layout for rendering.
        return { places, visible: this.visible, exiting: this.exiting }

    }
    
    animate(currentTime: number) {

        const completed: PhraseName[] = [];
    
        // For all of the active sequences, make progress on their current pose's moves, and advance to next poses.
        for(let [ name, animation ] of this.animations) {
    
            // Find the current Phrase corresponding to this name.
            const phrase = this.getPhraseByName(name);
    
            // Skip this animation if we couldn't find it, it must no longer be in the verse.
            // Mark the animation for completion.
            if(phrase === undefined) {
                completed.push(name);
                continue;
            }
    
            // Find the current Sequence corresponding to this name and kind.
            let sequence = phrase.getSequence(animation.kind);
    
            // If there's no longer a sequence on this phrase, but we did find a phrase,
            // see if it has a during sequence. If it doesn't, mark it completed. Otherwise,
            // resume it's during, whatever that might be.
            if(sequence === undefined) {
                // If the phrase has a during and wasn't animating an exit
                if(phrase.during && animation.kind !== "exit") {
                    sequence = phrase.during.asSequence();
                    const newAnimation = this.startSequence(phrase, sequence, "during");
                    if(newAnimation)
                        animation = newAnimation
                    else
                        continue;
    
                }
                else {
                    completed.push(name);
                    continue;
                }
            }
    
            // If we haven't started the sequence yet, start it!
            if(animation.currentPoseStartTime === undefined) {
    
                // Note the start time so we can determine when the pose is done.
                animation.currentPoseStartTime = currentTime;
    
                // Start values are:
                // 1) The most recent animated value
                // 2) If not that, the next value of the property in the entry sequence
                // 3) If not that, phrase's current property value
    
                // End values are:
                // 1) The next value of the property in the exit sequence
                // 2) If not that, the phrase's current property value
    
                if(animation.currentPose.size !== undefined) {
    
                    const start = 
                        // Always start from the latest animated value if there is one, to ensure continuity from any interrupted animation.
                        animation.moves.size !== undefined ? animation.moves.size.value :
                        // If an exit, the current phrase value
                        animation.kind === "exit" ? phrase.size :
                        // If this is the first pose, use it's size
                        (sequence.getFirstPose() === animation.currentPose ? animation.currentPose.size : undefined) ??
                        // Otherwise, next size in the sequence
                        sequence.getNextPoseThat(animation.currentPose, pose => pose.size !== undefined)?.size ??
                        // Otherwise, the phrase's current size
                        phrase.size;
                    
                    const end = 
                        // If this is the first pose, use it's size
                        (animation.kind === "exit" && sequence.getFirstPose() === animation.currentPose ? animation.currentPose.size : undefined) ??
                        // Next value in the sequence
                        sequence.getNextPoseThat(animation.currentPose, pose => pose.size !== undefined)?.size ??
                        // If the sequence will loop, choose the first pose's size
                        (phrase.willLoop(animation) ? sequence.getSequenceOfPose(animation.currentPose)?.getFirstPose()?.size : undefined) ??
                        // If there isn't one, the phrase's current size.
                        phrase.size;
    
                    animation.moves.size = {
                        start: start,
                        end: end,
                        // Update this to account for different kinds of sequences.
                        value: start
                    }
                }
    
            }
            // If we have started them, advance them, and stop them if they're done.
            else if(animation.currentPoseStartTime !== undefined && animation.moves !== undefined) {
    
                // Trim the percent to 100
                const percent = Math.min(1, (currentTime - animation.currentPoseStartTime) / (1000 * animation.currentPose.duration));
                // Convert percent to progress with an easing function.
                // TODO Allow this to be customized.
                const progress = 1 - Math.pow(1 - percent, 3);
    
                // Move toward the end value of each move.
                for(const move of Object.values(animation.moves)) {
                    if(typeof move.start === "number" && typeof move.end === "number")
                        move.value = move.start + progress * (move.end - move.start);
                }
    
                // If this pose is done, start the next pose in the sequence, or if there isn't one, end the sequence.
                if(percent === 1) {
    
                    const currentSequence = sequence.getSequenceOfPose(animation.currentPose);
                    const nextPoseOverall = sequence.getNextPose(animation.currentPose);
    
                    // If this specific sequence is over, but has more iterations, do another cycle.
                    if(phrase.willLoop(animation)) {
                        const firstInCurrent = currentSequence?.getFirstPose();
                        if(currentSequence && firstInCurrent) {
                            animation.iterations.set(currentSequence, 1 + (animation.iterations.get(currentSequence) ?? 0));
                            animation.currentPose = firstInCurrent;
                            animation.currentPoseStartTime = undefined;
                        }
                    }
                    // If there's another pose overall, do that one.
                    else if(nextPoseOverall) {
                        animation.currentPose = nextPoseOverall;
                        animation.currentPoseStartTime = undefined;
                        const newSequence = sequence.getSequenceOfPose(animation.currentPose);
                        if(newSequence && !animation.iterations.has(newSequence))
                            animation.iterations.set(newSequence, 1);
                    }
                    // Otherwise, this sequence is done.
                    else
                        completed.push(name);
    
                }
            
            }
    
        }
    
        // Now that we've updated all of the sequences, update the positions of all phrases involved in them using the new values.
        // This is because text, font, offset,Animation affect layout. We create a mapping to moves,
        // pass it to the render context, then rely on Phrases to use the moves values instead of the canonical values when present.
        const places = this.layout();
    
        // Render each phrase with the pose.
        for(const [ name, animation ] of this.animations)
            this.renderPhrase(name, animation, places);
    
        // Clean up all completed sequences.
        for(const name of completed) {
    
            const animation = this.animations.get(name);
            if(animation) {
    
                // Delete it from the animation list.
                this.animations.delete(name);
    
                // Find the current phrase.
                const phrase = this.getPhraseByName(name);
    
                if(phrase) {
    
                    // If it was an entry, see if there was a during
                    if(animation.kind === "entry") {
                        if(phrase && phrase.during)
                        this.startSequence(phrase, phrase.during.asSequence(), "during");
                    }
                    // If it was an exit, remove it from the belatedly rendered phrases.
                    else if(animation.kind === "exit") {
                        this.exiting.delete(phrase);
                    }
    
                }
    
            }
    
        }
    
        // Animate another frame if there are any remaining active sequences.
        if(this.getCount() > 0)
            window.requestAnimationFrame(time => this.animate(time));
    
    }

    renderPhrase(name: PhraseName, animation: Animation, places: Map<Group, Place>) {

        // Find the current Phrase corresponding to this name.
        const phrase = this.getPhraseByName(name);

        if(phrase === undefined)
            return;

        // Find the view to style
        const view = document.getElementById(`phrase-${name}`);
        if(view) {

            // Find the moves for each property, defaulting to the phrase's current value.
            const renderedPhrase = new Phrase(
                phrase.value,
                animation.moves.text?.value as TextLang[] ?? phrase.text,
                animation.moves.size?.value as number ?? phrase.size,
                animation.moves.font?.value as string ?? phrase.font,
                animation.moves.color?.value as Color ?? phrase.color,
                animation.moves.opacity?.value as number ?? phrase.opacity,
                animation.moves.place?.value as Place ?? phrase.place,
                animation.moves.offset?.value as Place ?? phrase.offset,
                animation.moves.rotation?.value as number ?? phrase.rotation,
                animation.moves.scalex?.value as number ?? phrase.scalex,
                animation.moves.scaley?.value as number ?? phrase.scaley
            );

            // Determine the render location (and if is an exiting phrase, fall back to it's last position)
            const place = places.get(phrase) ?? this.exiting.get(phrase);

            // Apply each style, as the PhraseView does, by creating a temporary Phrase.
            if(place)
                view.setAttribute("style", 
                    phraseToCSS(
                        renderedPhrase, 
                        renderedPhrase.place ?? place, 
                        this.verse.focus
                    )
                );

        }

    }

}