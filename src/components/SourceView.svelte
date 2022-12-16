<script lang="ts">
    import VerseView from './VerseView.svelte';
    import Editor from '../editor/Editor.svelte';
    import type Source from '../models/Source';
    import type Project from '../models/Project';
    import { playing, currentStep } from '../models/stores';
    import EvaluatorView from './EvaluatorView.svelte';
    import Exception from '../runtime/Exception';
    import { selectTranslation } from '../nodes/Translations';
    import { languages } from "../models/languages";
    import ValueView from './ValueView.svelte';
    import type Verse from '../output/Verse';
    import { toVerse } from '../output/Verse';
    import KeyboardIdle from '../models/KeyboardIdle';
    import Timeline from './Timeline.svelte';
    import ConflictsView from '../editor/ConflictsView.svelte';
    import type Conflict from '../conflicts/Conflict';

    export let project: Project;
    export let source: Source;
    export let interactive: boolean = false;

    let verse: Verse | undefined;
    let stepping: boolean = false;
    $: latest = $currentStep === undefined ? project.evaluator.getLatestSourceValue(source) : undefined;
    $: verse = latest === undefined ? undefined : $languages ? toVerse(latest) : undefined;
    $: stepping = (project.evaluator.getCurrentEvaluation()?.getSource() === source || (project.evaluator.isDone() && source === project.main));    
    let conflicts: Conflict[] = [];

</script>

<div class="source">
    <div class="source-title">
        <h2>{source.getNames()}</h2>
    </div>
    <div class="split">
        <div class="column">
            <div class="code">
                <Editor {project} {source} bind:conflicts={conflicts}/>
            </div>
            {#if stepping}
                <section class="footer evaluator">
                    <EvaluatorView evaluator={project.evaluator} {source}/>
                </section>
            {/if}
            {#if conflicts.length > 0}
                <section class="footer conflict">
                    <ConflictsView context={project.getContext(source)} {conflicts}/>
                </section>
            {/if}

        </div>
        <div class="column">
            <div class="output" style="{verse !== undefined ? `background-color: ${verse.background.toCSS()};` : undefined}">
                <!-- If there's an exception, show that. -->
                {#if latest instanceof Exception}
                    <div class="full exception"><div class='message'>{selectTranslation(latest.getExplanations(), $languages)}</div></div>
                <!-- If there's no verse -->
                {:else if latest === undefined}
                    <!-- If it's because the keyboard isn't idle , show the typing feedback.-->
                    {#if $playing && !$KeyboardIdle}
                        <div class="full editing"><div class='message'>⌨️</div></div>
                    {:else}
                        <div class="full evaluating"><div class='message'>...</div></div>
                    {/if}
                <!-- If there's a value, but it's not a verse, show that -->
                {:else if verse === undefined}
                    <div class="full value">
                        <div class='message'>
                            <h2>{selectTranslation(latest.getType(project.getContext(source)).getDescriptions(project.getContext(source)), $languages)}</h2>
                            <p><ValueView value={latest}/></p>
                        </div>
                    </div>
                <!-- Otherwise, show the Verse -->
                {:else}
                    <VerseView {project} {verse} {interactive}/>
                {/if}
            </div>
            {#if source === project.main}
                <div class="footer timeline">
                    <Timeline evaluator={project.evaluator} />
                </div>
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

    .column {
        display: flex;
        flex: 1;
        flex-direction: column;
        height: 100%;
        max-height: 40em;
        width: 50%;
    }

    .code {
        flex: 1;
        min-height: 20rem;
        max-height: 30em;
        width: 100%;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        box-sizing: content-box;
        overflow: scroll;
        scroll-behavior: smooth;
        box-sizing: border-box;
        box-shadow: inset calc(-1 * var(--wordplay-border-width)) 0 var(--wordplay-border-width) rgb(0 0 0 / 20%);
    }

    .footer {
        flex-basis: content;
        width: 100%;
        box-sizing: border-box;
    }

    .output {
        flex: 1;
        min-width: 0;
        min-height: 20em;
        overflow: hidden;
    }

    .conflict {
        flex-basis: content;
        width: 100%;
        min-height: 1em;
        padding: var(--wordplay-spacing);
        background-color: var(--wordplay-warning);
        color: var(--wordplay-background);
    }

    .code:has(.stepping) {
        border: var(--wordplay-border-width) solid var(--wordplay-executing-color);
        z-index: 2;
    }

    .code:focus-within {
        outline: var(--wordplay-highlight) solid var(--wordplay-border-width);
        z-index: 2;
    }

    .source h2 {
        display: inline;
    }

    .full {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .full .message {
        width: 50%;
        height: 50%;
        text-align: center;
        line-height: 100%;
        font-size: calc(var(--wordplay-font-size) * 2);
        transform-origin: center;
    }

    .editing .message {
        animation: jiggle 0.2s ease-out infinite;
    }

    .exception {
        color: var(--wordplay-background);
        background-color: var(--wordplay-error);
    }

    .exception .message {
        animation: shake .1s 3;
    }

    .output:focus-within {
        outline: var(--wordplay-highlight) solid var(--wordplay-border-width);
        z-index: 2;
    }

    @keyframes jiggle {
        0% { transform: rotate(-4deg) translate(0, 0); }
        25% { transform: rotate(6deg) translate(0, -1px); }
        50% { transform: rotate(-8deg) translate(0, 2px); }
        75% { transform: rotate(-2deg) translate(0, -4px); }
        100% { transform: rotate(4deg) translate(0, 1px); }
    }

</style>