<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type Project from '../models/Project';
    import type Source from '../models/Source';
    import type Value from '../runtime/Value';
    import OutputView from './OutputView.svelte';
    import { currentStep } from '../models/stores';

    export let project: Project;
    export let source: Source;

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

<div class="mini"
    tabIndex=0
    on:click={activate}
    on:keydown={ event => (event.key === "Enter" || event.key === " ") ? activate() : undefined }
>
    <div class="name">{source.getNames()}</div>
    <OutputView {project} {source} {latest} mode="mini" />
</div>

<style>

    .mini {
        width: auto;
        height: 5em;
        user-select: none;
        display: flex;
        flex-direction: row;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        overflow: hidden;
        cursor: pointer;
    }

    .name {
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: var(--wordplay-code-font);
        padding: var(--wordplay-spacing);
        background: var(--wordplay-chrome);
    }

    .mini:hover, .mini:focus {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight);
    }
</style>