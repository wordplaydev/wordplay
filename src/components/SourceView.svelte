<script lang="ts">
    import VerseView from './VerseView.svelte';
    import Editor from '../editor/Editor.svelte';
    import type Source from '../models/Source';
    import { onDestroy } from 'svelte';
    import type Project from '../models/Project';
    import type Evaluator from '../runtime/Evaluator';
    import type Structure from '../runtime/Structure';
    import EvaluatorView from './EvaluatorView.svelte';

    export let project: Project;
    export let source: Source;
    export let interactive: boolean = false;


    let previousEvaluator: Evaluator;
    $: evaluator = project.evaluator;
    let verse: Structure | undefined;

    /** In case the evaluator changes, stop listening to the old one and start listening to the new one.*/
    $: {
        previousEvaluator?.ignore(handleEvaluation);
        evaluator.observe(handleEvaluation);
        handleEvaluation();
    }

    function handleEvaluation() {
        verse = evaluator.getVerse();
    }

    onDestroy(() => evaluator.ignore(handleEvaluation));

</script>

<div class="source">
    <div class="source-title">
        <h2>{source.getNames()}</h2>
        <small>
        </small>
    </div>
    <div class="split">
        <div class="source-content">
            <Editor {project} {source} />
        </div>
        <div class="source-content" >
            {#if verse === undefined}
                <EvaluatorView evaluator={evaluator} />
            {:else}
                <VerseView {project} {verse} {evaluator} {interactive}/>
            {/if}
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
        scroll-behavior: smooth;
        box-sizing: border-box;
    }

    .source-content:last-child {
        border-left: var(--wordplay-border-width) solid var(--wordplay-border-color);;
    }

    .source-content:focus-within {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight);
        z-index: 2;
    }

    .source-content:has(.stepping) {
        border: var(--wordplay-border-width) solid var(--wordplay-executing-color);
    }

    .source h2 {
        display: inline;
    }

</style>