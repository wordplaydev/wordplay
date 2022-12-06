<svelte:options immutable={true}/>

<script lang="ts">
    import GroupView from "./GroupView.svelte";
    import { onMount } from "svelte";
    import { styleToCSS } from "../native/Style";
    import type Project from "../models/Project";
    import type { Verse } from "../native/Verse";
    import { playing } from "../models/stores";

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
    }

    function handleKeyUp(event: KeyboardEvent) {
        if(project.evaluator.isPlaying())
            project.streams.keyboard.record(event.key, false);
        else ignore();
    }
    function handleKeyDown(event: KeyboardEvent) {
        if(project.evaluator.isPlaying())
        project.streams.keyboard.record(event.key, true);
    }

    let visible = false;
    onMount(() => visible = true);

</script>

{#if visible}
    <div class="verse {interactive && $playing ? "" : "inert"} {ignored ? "ignored" : ""}" tabIndex={interactive ? 0 : null}
        on:mousedown={interactive ? handleMouseDown : null} 
        on:mouseup={interactive ? handleMouseUp : null}
        on:mousemove={interactive ? handleMouseMove : null}
        on:keydown|stopPropagation|preventDefault={interactive ? handleKeyDown : null}
        on:keyup={interactive ? handleKeyUp : null}
        style={styleToCSS(verse.style)}
    >
        <GroupView group={verse.group} />
    </div>
{/if}

<style>
    .verse {
        width: 100%; 
        height: 100%;
        display: flex;
        align-items: stretch;
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

</style>