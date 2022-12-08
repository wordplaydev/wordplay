<svelte:options immutable={true}/>

<script lang="ts">
    import { onMount } from "svelte";
    import type Project from "../models/Project";
    import type Verse from "../output/Verse";
    import { playing } from "../models/stores";
    import GroupView from "./GroupView.svelte";
    import Decimal from "decimal.js";
    import Place from "../output/Place";

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

</script>

{#if visible}
    <div 
        class="verse {interactive && $playing ? "" : "inert"} {ignored ? "ignored" : ""}" 
        tabIndex={interactive ? 0 : null}
        style="font-family: {verse.font};"
        on:mousedown={interactive ? handleMouseDown : null} 
        on:mouseup={interactive ? handleMouseUp : null}
        on:mousemove={interactive ? handleMouseMove : null}
        on:keydown|stopPropagation|preventDefault={interactive ? handleKeyDown : null}
        on:keyup={interactive ? handleKeyUp : null}
    >
        <div class="viewport">
            <GroupView {verse} group={verse} place={new Place(verse.value, new Decimal(0), new Decimal(0), new Decimal(0))}/>
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