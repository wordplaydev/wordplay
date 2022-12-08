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
    $: context = { font: verse.font, languages: $languages, fonts: $loadedFonts };

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

    // On every verse change, compute the canonical places of all phrases.
    let places = new Map<Group, Place>();
    let phrases: Phrase[];
    $: {

        // Erase the places
        places.clear();
        // Walk the Verse and compute global places for each group. 
        // This relies on each phrase and group to be able to size itself independent of its group
        // and then position based on sizes.
        layoutGroup(verse, [], places, context);

        // Compute the subset of groups that are phrases, just for efficiency.
        phrases = [];
        for(const group of places.keys())
            if(group instanceof Phrase)
                phrases.push(group);

    }

</script>

{#if visible}
    <div 
        class="verse {interactive && $playing ? "" : "inert"} {ignored ? "ignored" : ""}" 
        tabIndex={interactive ? 0 : null}
        style="font-family: {verse.font}; background-color: {verse.background.toCSS()}; color: {verse.foreground.toCSS()};"
        on:mousedown={interactive ? handleMouseDown : null} 
        on:mouseup={interactive ? handleMouseUp : null}
        on:mousemove={interactive ? handleMouseMove : null}
        on:keydown|stopPropagation|preventDefault={interactive ? handleKeyDown : null}
        on:keyup={interactive ? handleKeyUp : null}
    >
        <div class="viewport">
            <!-- Render all phrases at their places -->
            {#each phrases as phrase}
                {@const place = places.get(phrase)}
                <!-- There should always be a place. If there's not, there's something wrong with our layout algorithm. -->
                {#if place}
                    <PhraseView {phrase} {place} />
                {:else}
                    <span>Oops</span>
                {/if}
            {/each}
        </div>
    </div>
{/if}

<style>
    .verse {
        width: 100%; 
        height: 100%;
        position: relative;
        overflow: hidden;
    }

    .verse:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-border-width);
        z-index: 2;
    }

    .verse.inert:focus {
        outline: none;
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