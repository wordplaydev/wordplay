<svelte:options immutable={true}/>

<script lang="ts">
    import { onMount } from "svelte";
    import type Project from "../models/Project";
    import type Verse from "../output/Verse";
    import { playing } from "../models/stores";
    import type Place from "../output/Place";
    import type Group from "../output/Group";
    import { getLanguages } from "../editor/util/Contexts";
    import type { RenderContext } from "../output/Group";
    import Phrase from "../output/Phrase";
    import PhraseView from "./PhraseView.svelte";
    import { loadedFonts } from "../native/Fonts";
    import Sequence from "../output/Sequence";
    import phraseToCSS, { toCSS } from "../output/phraseToCSS";
    import type TextLang from "../output/TextLang";
    import type Color from "../output/Color";
    import type Animation from "../output/Animation";

    export let project: Project;
    export let verse: Verse;
    export let interactive: boolean;

    let ignored = false;

    function ignore() {
        ignored = true;
        setTimeout(() => ignored = false, 250);
    }

    function handleMouseDown() {
        if(project.evaluator.isPlaying())
            project.streams.mouseButton.record(true);
        else ignore();
    }
    
    function handleMouseUp() {
        if(project.evaluator.isPlaying())
            project.streams.mouseButton.record(false);
        else ignore();
    }

    function handleMouseMove(event: MouseEvent) {
        if(project.evaluator.isPlaying())
            project.streams.mousePosition.record(event.offsetX, event.offsetY);
        // Don't give feedback on this; it's not expected.
    }

    function handleKeyUp(event: KeyboardEvent) {
        if(project.evaluator.isPlaying())
            project.streams.keyboard.record(event.key, false);
        else ignore();
    }
    function handleKeyDown(event: KeyboardEvent) {
        if(project.evaluator.isPlaying())
            project.streams.keyboard.record(event.key, true);
        else ignore();
    }

    let visible = false;
    onMount(() => visible = true);

    // Make a render context and keep it up to date whenver the verse, languages, or loaded fonts change.
    let languages = getLanguages();
    $: context = { font: verse.font, languages: $languages, fonts: $loadedFonts, animations: new Map<Phrase, Animation>() };
    // A top down layout algorithm that places groups first, then their subgroups, and uses the
    // ancestor list to compute global places for each group.
    function layoutGroup(group: Group, parents: Group[], places: Map<Group, Place>, context: RenderContext) {
        // Add this group to the parent stack.
        parents.unshift(group);
        // Get this group's place, so we can offset its subgroups.
        const parentPlace = places.get(group);
        // Get the places of each of this group's subgroups.
        for(const [ subgroup, place ] of group.getPlaces(context)) {
            // Set the place of this subgroup, offseting it by the parent's position to keep it in global coordinates.
            places.set(subgroup, parentPlace ? place.offset(parentPlace) : place);
            // Now that this subgroup's position is set, layout the subgroup's subgroups.
            layoutGroup(subgroup, parents, places, context);
        }
        // Remove this group from the top of the parent stack.
        parents.shift();
    }

    type PhraseName = string;

    // On every verse change, compute the canonical places of all phrases.
    let places = new Map<Group, Place>();
    let previouslyPresent: Set<Phrase> = new Set();
    let presentPhrases: Phrase[] = [];
    let visiblePhrases: Phrase[] = [];
    let exitingPhrases: Map<Phrase, Place> = new Map();
    let animations = new Map<PhraseName, Animation>();
    $: {

        // Remember the previous places for exiting phrases.
        const previousPlaces  = new Map(places);

        // Reset the places
        places.clear();

        // Walk the Verse and compute global places for each group. 
        // This relies on each phrase and group to be able to size itself independent of its group
        // and then position based on sizes.
        layoutGroup(verse, [], places, context);

        // Create sets of who entered and exited.
        let enteredNames = new Set<PhraseName>();
        let exitedNames = new Set<PhraseName>();

        // Compute the subset of groups that are phrases to prepare for rendering.
        const namesPresentNow = new Set<PhraseName>();
        presentPhrases = [];
        visiblePhrases = [];
        for(const [ phrase, place ] of places) {
            // Exclude those that are behind the focal point on the z-axis, since they're invisible anyway.
            if(phrase instanceof Phrase) {

                // Is this phrase new? Add to the entered set and mark it present.
                const name = phrase.getName();
                if(!(Array.from(previouslyPresent)).some(p => p.getName() === name))
                    enteredNames.add(name);
                
                // Note that this phrase is now present.
                namesPresentNow.add(name);

                // Keep a list of all phrases present, even if not rendered.
                presentPhrases.push(phrase);
                // If it's in front of the focus, it's visible.
                if(place.z.sub(verse.focus.z).greaterThan(0))
                    visiblePhrases.push(phrase);
            }
        }

        // Now that we have a list of everyone present, remove everyone that was present that is no longer, and note that they exited.
        for(const phrase of previouslyPresent) {
            const name = phrase.getName();
            if(!namesPresentNow.has(name)) {
                previouslyPresent.delete(phrase);
                exitedNames.add(name);
                // If the phrase has an exit squence, then add it to the phrases to keep rendering
                // and remember it's current place.
                if(phrase.exit) {
                    const place = previousPlaces.get(phrase);
                    if(place)
                        exitingPhrases.set(phrase, place);
                }
            }
        }

        // Mark everyone now present as previously present for next time.
        previouslyPresent = new Set(presentPhrases);

        // Finally, sort the phrases by distance from the focal point.
        visiblePhrases.sort((a, b) => {
            const aPlace = places.get(a);
            const bPlace = places.get(b);
            return aPlace === undefined ? -1 :
                bPlace == undefined ? 1 :
                aPlace.z.sub(verse.focus.z).sub(bPlace.z.sub(verse.focus.z)).toNumber()
        });

        // Find all of the phrases that specify a sequence.
        for(const phrase of [ ... visiblePhrases, ... exitingPhrases.keys()]) {
            const name = phrase.getName();
            // Is there any entry sequence, but not yet an animation for this phrase?
            let sequence: Sequence | undefined = undefined;
            let kind: "entry" | "between" | "during" | "exit" | undefined = undefined;

            // Does it have an entry and just entered? Start it's entry animation.
            if(phrase.entry && enteredNames.has(name)) {
                // Convert the pose to a sequence if it's not one, since a single pose is basically a sequence of one pose.
                sequence = phrase.entry instanceof Sequence ? phrase.entry : new Sequence(phrase.value, 1, [ phrase.entry ]);
                kind = "entry";
            }
            // Does it have a during?
            if(phrase.exit && exitedNames.has(name)) {
                sequence = phrase.exit instanceof Sequence ? phrase.exit : new Sequence(phrase.value, 1, [ phrase.exit ]);
                kind = "exit";
            }

            if(sequence && kind) {
                // Get the first pose in the sequence
                const firstPose = sequence.getFirstPose();
                // Only add a sequence for this phrase if there's a first pose.
                if(firstPose && sequence.count > 0) {         
                    // Set a sequence for this phrase, starting at the first pose.
                    const iterations = new Map<Sequence, number>();
                    iterations.set(sequence, 1);
                    animations.set(name, { 
                        kind: kind, 
                        phrase, 
                        sequence, 
                        currentPose: firstPose, 
                        currentPoseStartTime: undefined, 
                        iterations: iterations,
                        moves: {}
                    })
                }
            }
        }

        if(animations.size > 0)
            window.requestAnimationFrame(animate);

    }

    function animate(currentTime: number) {

        const completed: PhraseName[] = [];

        // For all of the active sequences, make progress on their current pose's moves, and advance to next poses.
        for(const [ name, animation ] of animations) {
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
                        // If an exit, the current phrase value
                        animation.kind === "exit" ? animation.phrase.size :
                        // Latest value
                        animation.moves.size !== undefined ? animation.moves.size.end :
                        // If this is the first pose, use it's size
                        (animation.sequence.getFirstPose() === animation.currentPose ? animation.currentPose.size : undefined) ??
                        // Otherwise, next size in the sequence
                        animation.sequence.getNextPoseThat(animation.currentPose, pose => pose.size !== undefined)?.size ??
                        // Otherwise, the phrase's current size
                        animation.phrase.size;
                    
                    const end = 
                        // If this is the first pose, use it's size
                        (animation.kind === "exit" && animation.sequence.getFirstPose() === animation.currentPose ? animation.currentPose.size : undefined) ??
                        // Next value in the sequence
                        animation.sequence.getNextPoseThat(animation.currentPose, pose => pose.size !== undefined)?.size ??
                        // If there isn't one, the phrase's current size.
                        animation.phrase.size;
                    
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

                    const currentSequence = animation.sequence.getSequenceOfPose(animation.currentPose);
                    const nextPoseInSequence = currentSequence?.getNextPose(animation.currentPose);
                    const nextPoseOverall = animation.sequence.getNextPose(animation.currentPose);

                    // If this specific sequence is over, but has more iterations, do another cycle.
                    const firstInCurrent = currentSequence?.getFirstPose();
                    const iterations = currentSequence ? animation.iterations.get(currentSequence) : undefined;
                    if(iterations === undefined) throw Error("No iterations for sequence for sequence " + currentSequence);
                    if(currentSequence && nextPoseInSequence === undefined && iterations < currentSequence.count && firstInCurrent) {
                        console.log("Repeating sequence.");
                        animation.iterations.set(currentSequence, 1 + (animation.iterations.get(currentSequence) ?? 0));
                        animation.currentPose = firstInCurrent;
                        animation.currentPoseStartTime = undefined;
                    }
                    // If there's another pose overall, do that one.
                    else if(nextPoseOverall) {
                        animation.currentPose = nextPoseOverall;
                        animation.currentPoseStartTime = undefined;
                        const newSequence = animation.sequence.getSequenceOfPose(animation.currentPose);
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
        const renderedPlaces = new Map<Group, Place>();
        const movesByPhrase = new Map<Phrase, Animation>();
        for(const seq of animations.values()) movesByPhrase.set(seq.phrase, seq);
        context.animations = movesByPhrase;

        // Do a layout for the phrases still in place.
        layoutGroup(verse, [], renderedPlaces, context);

        // Update the appearance of each phrase with the new layouts.
        for(const [ name, sequence ] of animations) {

            // Find the view to style
            const view = document.getElementById(`phrase-${name}`);
            if(view && sequence.moves) {

                // Find the moves for each property, defaulting to the phrase's current value.
                const renderedPhrase = new Phrase(
                    sequence.phrase.value,
                    sequence.moves.text?.value as TextLang[] ?? sequence.phrase.text,
                    sequence.moves.size?.value as number ?? sequence.phrase.size,
                    sequence.moves.font?.value as string ?? sequence.phrase.font,
                    sequence.moves.color?.value as Color ?? sequence.phrase.color,
                    sequence.moves.opacity?.value as number ?? sequence.phrase.opacity,
                    sequence.moves.place?.value as Place ?? sequence.phrase.place,
                    sequence.moves.offset?.value as Place ?? sequence.phrase.offset,
                    sequence.moves.rotation?.value as number ?? sequence.phrase.rotation,
                    sequence.moves.scalex?.value as number ?? sequence.phrase.scalex,
                    sequence.moves.scaley?.value as number ?? sequence.phrase.scaley
                );

                // Determine the render location (and if is an exiting phrase, fall back to it's last position)
                const place = renderedPlaces.get(sequence.phrase) ?? exitingPhrases.get(sequence.phrase);

                // Apply each style, as the PhraseView does, by creating a temporary Phrase.
                if(place)
                    view.setAttribute("style", 
                        phraseToCSS(
                            renderedPhrase, 
                            renderedPhrase.place ?? place, 
                            verse.focus
                        )
                    );

            }

        }

        // Clean up all completed sequences.
        for(const name of completed) {

            const animation = animations.get(name);
            if(animation) {

                // If it was an exit, remove it from the belatedly rendered phrases.
                if(animation.kind === "exit") {
                    exitingPhrases.delete(animation.phrase);
                }

                // Delete it from the animation list.
                animations.delete(name);
            }

        }     

        // Animate another frame if there are any remaining active sequences.
        if(animations.size > 0)
            window.requestAnimationFrame(animate);
    }

</script>

{#if visible}
    <div 
        class="verse {interactive && $playing ? "" : "inert"} {ignored ? "ignored" : ""}" 
        tabIndex={interactive ? 0 : null}
        style={toCSS({
            "font-family": verse.font,
            // Background is set in source view
            "color": verse.foreground.toCSS(),
            "transform": verse.tilt.toNumber() !== 0 ? `rotate(${verse.tilt.toNumber()}deg)` : undefined
        })}
        on:mousedown={interactive ? handleMouseDown : null}
        on:mouseup={interactive ? handleMouseUp : null}
        on:mousemove={interactive ? handleMouseMove : null}
        on:keydown|stopPropagation|preventDefault={interactive ? handleKeyDown : null}
        on:keyup={interactive ? handleKeyUp : null}
    >
        <div class="viewport">
            <!-- Render all visible phrases at their places, as well as any exiting phrases -->
            {#each visiblePhrases as phrase}
                {@const place = places.get(phrase)}
                <!-- There should always be a place. If there's not, there's something wrong with our layout algorithm. -->
                {#if place}
                    <PhraseView {phrase} {place} focus={verse.focus} />
                {:else}
                    <span>No place for Phrase, oops</span>
                {/if}
            {/each}
            {#each [...exitingPhrases ] as [ phrase, place ]}
                <!-- There should always be a place. If there's not, there's something wrong with our layout algorithm. -->
                <PhraseView {phrase} {place} focus={verse.focus} />
            {/each}
        </div>
    </div>
{/if}

<style>
    .verse {
        width: 100%; 
        height: 100%;
        position: relative;
    }

    .inert {
        background-color: var(--wordplay-disabled-color);
    }

    .ignored {
        animation: shake 0.25s 1;
    }

    .viewport {
        width: 100%;
        height: 100%;
        transform: translate(50%, 50%);
    }

    :global(.group.debug, .phrase.debug) {
        border: 1px dotted red;
    }

</style>