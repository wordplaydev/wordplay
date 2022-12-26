<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type Project from '../models/Project';
    import type Source from '../models/Source';
    import type Value from '../runtime/Value';
    import OutputView from './OutputView.svelte';
    import { currentStep } from '../models/stores';

    export let project: Project;
    export let source: Source;
    export let selected: boolean;

    const dispatch = createEventDispatcher<{ activate: { source: Source }}>();

    function activate() {
        dispatch("activate", { source });
    }

    let latest: Value | undefined;
    $: { 
        $currentStep;
        latest = project.evaluator.getLatestSourceValue(source);
    }

</script>

<div class="mini" class:selected
    tabIndex=0
    on:click={activate}
    on:keydown={ event => { if (event.key === "Enter" || event.key === " ") { activate(); event.preventDefault() }}}
>
    <div class="name">{source.getNames()}</div>
    {#if !selected}
        <OutputView {project} {source} {latest} mode="mini" />
    {/if}
</div>

<style>
    .mini {
        width: auto;
        user-select: none;
        display: flex;
        flex-direction: row;
        overflow: hidden;
        cursor: pointer;
        opacity: 0.5;
        border-right: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .selected {
        opacity: 1;
    }

    .name {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: var(--wordplay-spacing);
    }

    .mini:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
    }
</style>