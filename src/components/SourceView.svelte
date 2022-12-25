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
    import { fade } from 'svelte/transition';
    import { playing } from '../models/stores';

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

{#if !fullscreen}
    <h2 class="name">{source.getNames()}</h2>
    <section class="code" class:stepping transition:fade>
        <Editor {project} {source} bind:conflicts={conflicts} bind:input={input}/>
    </section>
    <ConflictsView context={project.getContext(source)} {conflicts}/>
{/if}
<OutputView {project} {source} {latest} mode={fullscreen ? "fullscreen" : "peripheral"} on:fullscreen />

<style>

    .code {
        width: 100%;
        height: 100%;
        color: var(--wordplay-foreground);
        scroll-behavior: smooth;
    }

    .name {
        color: var(--wordplay-disabled-color);
    }

</style>