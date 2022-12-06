<script lang="ts">
    import VerseView from './VerseView.svelte';
    import Editor from '../editor/Editor.svelte';
    import type Source from '../models/Source';
    import type Project from '../models/Project';
    import { valueToVerse, Verse } from '../native/Verse';
    import { currentStep, playing } from '../models/stores';
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
        stepping = !$playing && 
            (project.evaluator.getCurrentEvaluation()?.getSource() === source || (project.evaluator.isDone() && source === project.main));
    }

</script>

<div class="source">
    <div class="source-title">
        <h2>{source.getNames()}</h2>
    </div>
    <div class="split">
        <div class="column">
            <div class="code">
                <Editor {project} {source} />
            </div>
            {#if stepping }
                <div class="evaluator">
                    <EvaluatorView evaluator={project.evaluator}/>
                </div>
            {/if}
        </div>
        {#if verse !== undefined}
            <div class="output">
                <VerseView {project} {verse} {interactive}/>
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

    .column {
        flex: 1;
        flex-direction: column;
        height: 100%;
        width: 50%;
    }

    .code {
        flex: 1;
        min-height: 20rem;
        max-height: 40rem;
        width: 100%;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        box-sizing: content-box;
        overflow: scroll;
        scroll-behavior: smooth;
        box-sizing: border-box;
        box-shadow: inset calc(-1 * var(--wordplay-border-width)) 0 var(--wordplay-border-width) rgb(0 0 0 / 20%);
    }

    .evaluator {
        flex-basis: content;
        width: 100%;
    }

    .output {
        flex: 1;
        min-width: 0;
    }

    .code:has(.stepping) {
        border: var(--wordplay-border-width) solid var(--wordplay-executing-color);
        z-index: 2;
    }

    .code:focus-within, .output:focus-within {
        outline: var(--wordplay-highlight) solid var(--wordplay-border-width);
        z-index: 2;
    }

    .source h2 {
        display: inline;
    }

</style>