<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type Project from '../models/Project';
    import type Source from '../nodes/Source';
    import type Value from '../runtime/Value';
    import OutputView from './OutputView.svelte';
    import { currentStep, nodeConflicts } from '../models/stores';

    export let project: Project;
    export let source: Source;
    export let selected: boolean;

    const dispatch = createEventDispatcher<{ activate: { source: Source } }>();

    function activate() {
        dispatch('activate', { source });
    }

    let latest: Value | undefined;
    $: {
        $currentStep;
        latest = project.evaluator.getLatestSourceValue(source);
    }

    // The number of conflicts is the number of nodes in the source involved in conflicts
    let primaryCount = 0;
    let secondaryCount = 0;
    $: {
        primaryCount = 0;
        secondaryCount = 0;
        for (const conflict of $nodeConflicts) {
            const nodes = conflict.getConflictingNodes();
            if (source.contains(nodes.primary)) {
                if (!conflict.isMinor()) primaryCount++;
                else secondaryCount++;
            } else if (
                nodes.secondary !== undefined &&
                source.contains(nodes.secondary)
            )
                secondaryCount++;
        }
    }
</script>

<div
    class="mini"
    class:selected
    tabIndex="0"
    on:click={activate}
    on:keydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            activate();
            event.preventDefault();
        }
    }}
>
    <div class="name"
        >{source.getNames()}{#if primaryCount > 0}<span class="count primary"
                >{primaryCount}</span
            >{/if}{#if secondaryCount > 0}<span class="count secondary"
                >{secondaryCount}</span
            >{/if}</div
    >
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
        border-right: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .count {
        font-size: small;
        border-radius: 50%;
        padding: var(--wordplay-spacing);
        color: var(--wordplay-background);
        min-width: 2.25em;
        text-align: center;
        margin-left: var(--wordplay-spacing);
    }

    .primary {
        background-color: var(--wordplay-error);
    }

    .secondary {
        background-color: var(--wordplay-warning);
    }

    .selected {
        font-weight: bold;
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
