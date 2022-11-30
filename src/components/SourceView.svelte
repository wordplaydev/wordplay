<script lang="ts">
    import VerseView from './VerseView.svelte';
    import Editor from '../editor/Editor.svelte';
    import type Source from '../models/Source';
    import { onDestroy } from 'svelte';
    import type Project from '../models/Project';
    import type Evaluator from '../runtime/Evaluator';
    import Button from './Button.svelte';
    import { WRITE } from '../nodes/Translations';
    import Switch from './Switch.svelte';

    export let project: Project;
    export let source: Source;
    export let interactive: boolean = false;


    let previousEvaluator: Evaluator;
    $: evaluator = project.getEvaluator(source);
    $: verse = evaluator?.getVerse();

    /** In case the evaluator changes, stop listening to the old one and start listening to the new one.*/
    $: {
        previousEvaluator?.ignore(handleEvaluation);
        evaluator?.observe(handleEvaluation);
    }

    let autoplay = true;

    function handleEvaluation() {
        verse = evaluator?.getVerse();
    }

    function handleStep() {
        evaluator?.stepWithinProgram();
    }

    function handleStepOut() {
        evaluator?.stepOut();
    }

    function playPause(play: boolean) {
        autoplay = play;
        if(autoplay) evaluator?.play();
        else evaluator?.pause();
    }

    onDestroy(() => evaluator?.ignore(handleEvaluation));

</script>

<div class="source">
    <div class="source-title">
        <h2>{source.getNames()}</h2>
        <small>
            <!-- If it's output, show controls -->
            <Switch 
                on={autoplay}
                toggle={playPause} 
                tip={
                    autoplay ? 
                        { eng: "Evaluate the program one step at a time", "😀": WRITE } : 
                        { eng: "Evaluate the program fully", "😀": WRITE }
                } 
                offLabel={{ eng: "pause", "😀": WRITE }}
                onLabel={{ eng: "play", "😀": WRITE }}
            />
            <Button 
                label={{ eng: "step", "😀": WRITE }}
                tip={{ eng: "Advance one step in the program's evaluation.", "😀": WRITE }}
                action={handleStep} 
                enabled={!autoplay && evaluator !== undefined && !evaluator.isDone()} 
            />
            <Button 
                label={{ eng: "step out", "😀": WRITE }}
                tip={{ eng: "Step out of this function.", "😀": WRITE }}
                action={handleStepOut} 
                enabled={!autoplay && evaluator !== undefined && !evaluator.isDone()}>
            </Button>
        </small>
    </div>
    <div class="split">
        <div class="source-content">
            <Editor {source} />
        </div>
        <div class="source-content" >
            {#if evaluator}
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
    }

    .source-content:last-child {
        border-left: var(--wordplay-border-width) solid var(--wordplay-border-color);;
    }

    .source-content:focus-within {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight);
    }

    .source h2 {
        display: inline;
    }

</style>