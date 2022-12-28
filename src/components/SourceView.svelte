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
    import Split from './Split.svelte';

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

<div class="source">
    <Split split={35} responsive flip>
        <div class="output" slot="first">
            <OutputView {project} {source} {latest} mode={fullscreen ? "fullscreen" : "peripheral"} on:fullscreen />
            {#if !fullscreen}
                <Timeline evaluator={project.evaluator} />
            {/if}
        </div>
        <div class="code" slot="last">
            {#if !fullscreen}
                <div class="sources">
                    {#each project.getSources() as src}
                        <MiniSourceView {project} source={src} selected={source === src} on:activate/>
                    {/each}
                </div>
                <Editor {project} {source} bind:conflicts={conflicts} bind:input={input} bind:viewport/>
            {/if}
        </div>
    </Split>
</div>

<style>
    .source {
        height: 100vh;
    }

    .sources {
        display: flex;
        flex-direction: row;
        border-bottom: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .output {
        display: flex;
        flex-direction: column;
        flex: 1;
        width: 100%;
    }

    .code {
        display: flex;
        flex-direction: column;
        flex: 1;
        width: 100%;
        height: 100%;
    }

</style>