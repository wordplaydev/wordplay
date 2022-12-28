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

    let latest: Value | undefined;
    $: {
        $currentStep;
        $languages;
        latest = project.evaluator.getLatestSourceValue(source);
    }

</script>

<section class="source">
    <div class="half first">
        <OutputView {project} {source} {latest} mode={fullscreen ? "fullscreen" : "peripheral"} on:fullscreen />
        {#if !fullscreen}
            <Timeline evaluator={project.evaluator} />
        {/if}
    </div>
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

    @media (max-aspect-ratio: 4/5) {
        .source {
            flex-direction: column;
        }
        .first {
            height: 30vh;
        }
    }
    @media (min-aspect-ratio: 4/5) {
        .source {
            flex-direction: row-reverse;
        }
        .first {
            border-left: var(--wordplay-border-width) solid var(--wordplay-border-color);
            height: 100vh;
            width: 30vw;
        }
        .last {
            height: 100vh;
            width: 100%;
        }
    }

    .last {
        flex-grow: 1;
    }

    .half {
        display: flex;
        flex-direction: column;
        min-width: 20em;
        min-height: 20em;
    }    

    .sources {
        display: flex;
        flex-direction: row;
        border-bottom: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

</style>