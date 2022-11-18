<script lang="ts">
    import VerseView from './VerseView.svelte';
    import Editor from '../editor/Editor.svelte';
    import type Source from '../models/Source';
    import { onDestroy } from 'svelte';

    export let source: Source;
    let previousSource: Source;

    $: {
        previousSource?.ignore(handleEvaluation);
        source.observe(handleEvaluation);
    }

    $: verse = source.getVerse();
    $: evaluator = source.evaluator;
    
    let autoplay = true;

    function handleEvaluation() {
        source = source;
        verse = source.getVerse();
    }

    function handleStep() {
        source.evaluator.stepWithinProgram();
    }

    function handleStepOut() {
        source.evaluator.stepOut();
    }

    function playPause() {
        autoplay = !autoplay;
        if(autoplay) source.evaluator.play();
        else source.evaluator.pause();
    }

    onDestroy(() => source.ignore(handleEvaluation));

</script>

<div class="source">
    <div class="source-title">
        <h2>{source.getName()}</h2>
        <small>
            <!-- If it's output, show controls -->
            <span on:click={playPause}>{autoplay ? "⏸" : "▶️"}</span>
            <button on:click={handleStep} disabled={autoplay || source.getEvaluator().isDone()}>step</button>
            <button on:click={handleStepOut} disabled={autoplay || source.getEvaluator().isDone()}>step out</button>
        </small>
    </div>
    <div class="split">
        <div class="source-content">
            <Editor source={source} />
        </div>
        <div class="source-content">
            <VerseView verse={verse} evaluator={evaluator}/>
        </div>
    </div>
</div>

<style>
    .source {
        display: flex;
        flex-flow: column;
        /* flex: 1; Have each document fill an equal amount of space in the window manager */
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
    }

    .source-title {
        background: var(--wordplay-chrome);
        padding: var(--wordplay-spacing);
        border-bottom: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .split {
        display: flex;
        flex-direction: row;
        flex-grow: 1;
        align-items: stretch;
        min-width: 0;
    }

    .source-content {
        flex: 1; /* 50/50 split */
        min-height: 20rem;
        max-height: 40rem;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        box-sizing: content-box;
        overflow: scroll;
    }

    .source-content:last-child {
        border-left: var(--wordplay-border-width) solid var(--wordplay-border-color);;
    }

    .source-content:focus-within {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight);
        outline-offset: calc(-1 * var(--wordplay-border-width));
    }

    .source h2 {
        display: inline;
    }

</style>