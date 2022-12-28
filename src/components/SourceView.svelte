<svelte:options immutable={true}/>
<script lang="ts">
    import Editor from '../editor/Editor.svelte';
    import type Source from '../models/Source';
    import type Project from '../models/Project';
    import { currentStep } from '../models/stores';
    import { languages } from "../models/languages";
    import type Conflict from '../conflicts/Conflict';
    import type Value from '../runtime/Value';
    import OutputView from './OutputView.svelte';
    import MiniSourceView from './MiniSourceView.svelte';
    import Timeline from './Timeline.svelte';
    import type Rect from './Rect';

    export let project: Project;
    export let source: Source;
    export let fullscreen: boolean;
    export let input: HTMLInputElement | null;
    export let conflicts: Conflict[] = [];
    export let viewport: Rect | undefined;

    let divider: HTMLElement | undefined;
    let split = 35;

    let latest: Value | undefined;
    $: {
        $currentStep;
        $languages;
        latest = project.evaluator.getLatestSourceValue(source);
    }

    function handleDividerMove(event: KeyboardEvent) {

        if(event.key === "ArrowRight" || event.key === "ArrowUp") {
            split = Math.max(0, split - 5);
            event.preventDefault();
        }
        else if(event.key === "ArrowLeft" || event.key === "ArrowDown") {
            split = Math.min(100, split + 5);
            event.preventDefault();
        }

    }

    let dragging = false;

    function grab() { dragging = true; }
    function release() { dragging = false; }
    function drag(event: MouseEvent) {
        const rect = event.currentTarget instanceof Element ? event.currentTarget.getBoundingClientRect() : undefined;
        if(rect === undefined || divider === undefined || dragging === false) return;
        const horizontal = divider.clientWidth < 25;
        const [ position, length ] = horizontal ? [ event.clientX - rect.left, rect.width ] : [ event.clientY - rect.top, rect.height ];
        split = Math.min(100, Math.max(0, Math.round(100 * position / length)));
        if(horizontal) split = 100 - split;
        event.preventDefault();
    }

</script>

<section class="source" 
    style="--divider-split: {split}"
    on:mousemove|stopPropagation={drag}
    on:mouseup|stopPropagation={release}
>
    <div class="half first">
        <OutputView {project} {source} {latest} mode={fullscreen ? "fullscreen" : "peripheral"} on:fullscreen />
        {#if !fullscreen}
            <Timeline evaluator={project.evaluator} />
        {/if}
    </div>
    <div class="divider"
        bind:this={divider}
        tabIndex=0
        on:mousedown|stopPropagation={grab}
        on:keydown={handleDividerMove}
        on:blur={release}
    />
    <div class="half last">
        {#if !fullscreen}
            <div class="sources">
                {#each project.getSources() as src}
                    <MiniSourceView {project} source={src} selected={source === src} on:activate/>
                {/each}
            </div>
            <Editor {project} {source} bind:conflicts={conflicts} bind:input={input} bind:viewport/>
        {/if}
    </div>
</section>

<style>
    .source {
        display: flex;
        height: 100vh;
    }

    .divider {
        z-index: var(--wordplay-layer-controls);
        background-color: var(--wordplay-border-color);
    }

    .divider:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
        background-color: var(--wordplay-highlight);
    }

    @media screen {
        .source {
            flex-direction: row-reverse;
        }
        .first {
            border-left: var(--wordplay-border-width) solid var(--wordplay-border-color);
            height: 100vh;
            flex-basis: calc(var(--divider-split) * 1vw);
        }
        
        .last {
            height: 100vh;
        }

        .divider {
            height: 100%;
            width: var(--wordplay-spacing);
            cursor: ew-resize;
        }
    }

    @media screen and (max-width: 1280px) {
        .source {
            flex-direction: column;
        }
        
        .first {
            flex-basis: calc(var(--divider-split) * 1vh);
        }
        
        .divider {
            width: 100%;
            height: var(--wordplay-spacing);
            cursor: ns-resize;
        }
    }

    .last {
        flex-grow: 1;
        flex-basis: 10em;
    }

    .half {
        display: flex;
        flex-direction: column;
        min-width: 2em;
        min-height: 2em;
    }    

    .sources {
        display: flex;
        flex-direction: row;
        border-bottom: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

</style>