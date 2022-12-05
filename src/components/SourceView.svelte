<script lang="ts">
    import VerseView from './VerseView.svelte';
    import Editor from '../editor/Editor.svelte';
    import type Source from '../models/Source';
    import type Project from '../models/Project';
    import { valueToVerse, Verse } from '../native/Verse';
    import { currentStep } from '../models/stores';
    import EvaluatorView from './EvaluatorView.svelte';

    export let project: Project;
    export let source: Source;
    export let interactive: boolean = false;

    let verse: Verse | undefined;
    let stepping: boolean = false;
    $: {
        $currentStep;
        const latest = project.evaluator.getLatestSourceValue(source);
        verse = latest === undefined ? undefined: valueToVerse(project.evaluator, latest);
        stepping = project.evaluator.isStepping() && project.evaluator.getCurrentEvaluation()?.getSource() === source;
    }

</script>

<div class="source">
    <div class="source-title">
        <h2>{source.getNames()}</h2>
        <small>
        </small>
    </div>
    <div class={`split ${verse === undefined && stepping ? "column" : ""}`}>
        <div class="source-content">
            <Editor {project} {source} />
        </div>
        {#if verse !== undefined}
            <div class="source-content">
                <VerseView {project} {verse} {interactive}/>
            </div>
        {:else if stepping}
            <div class="evaluator">
                <EvaluatorView evaluator={project.evaluator}/>
            </div>
        {/if}
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

    .split.column {
        flex-direction: column;
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

    .source-content:has(.stepping) {
        outline: var(--wordplay-border-width) solid var(--wordplay-executing-color);
        z-index: 2;
    }

    .source-content:focus-within {
        border: var(--wordplay-highlight) solid var(--wordplay-border-width);
        z-index: 2;
    }

    .source h2 {
        display: inline;
    }

</style>