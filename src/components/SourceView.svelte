<svelte:options immutable={true}/>
<script lang="ts">
    import Editor from '../editor/Editor.svelte';
    import type Source from '../models/Source';
    import type Project from '../models/Project';
    import { currentStep } from '../models/stores';
    import { languages } from "../models/languages";
    import ConflictsView from '../editor/ConflictsView.svelte';
    import type Conflict from '../conflicts/Conflict';
    import type Value from '../runtime/Value';
    import OutputView from './OutputView.svelte';
    import { playing } from '../models/stores';
    import MiniSourceView from './MiniSourceView.svelte';
    import Timeline from './Timeline.svelte';
    import EvaluatorView from './EvaluatorView.svelte';

    export let project: Project;
    export let source: Source;
    export let fullscreen: boolean;
    export let input: HTMLInputElement | null;

    let latest: Value | undefined;
    $: {
        $currentStep;
        $languages;
        latest = project.evaluator.getLatestSourceValue(source);
    }
    $: stepping = !$playing;

    // The list of conflicts from the editor.
    let conflicts: Conflict[] = [];

</script>

<section class="source">
    <OutputView {project} {source} {latest} mode={fullscreen ? "fullscreen" : "peripheral"} on:fullscreen />
    {#if !fullscreen}
        <Timeline evaluator={project.evaluator} />
        <div class="sources">
            {#each project.getSources() as src}
                <MiniSourceView {project} source={src} selected={source === src} on:activate/>
            {/each}
        </div>
        <Editor {project} {source} bind:conflicts={conflicts} bind:input={input}/>
        {#if stepping}
            <EvaluatorView evaluator={project.evaluator}/>
        {:else}
            <ConflictsView context={project.getContext(source)} {conflicts}/>
        {/if}
    {/if}
</section>

<style>

    .source {
        display: flex;
        flex-direction: column;
        height: 100vh;
    }

    .sources {
        display: flex;
        flex-direction: row;
        border-bottom: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

</style>