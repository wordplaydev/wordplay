<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type Project from '../../models/Project';
    import type Source from '@nodes/Source';
    import type Value from '@runtime/Value';
    import OutputView from '../output/OutputView.svelte';
    import { currentStep, nodeConflicts } from '../../models/stores';

    export let project: Project;
    export let source: Source;

    const dispatch = createEventDispatcher();

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
            if (source.contains(nodes.primary.node)) {
                if (!conflict.isMinor()) primaryCount++;
                else secondaryCount++;
            } else if (
                nodes.secondary !== undefined &&
                source.contains(nodes.secondary.node)
            )
                secondaryCount++;
        }
    }

    let width;
    let height;
</script>

<div
    class="mini"
    tabIndex="0"
    on:click={() => dispatch('toggle')}
    on:keydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') dispatch('toggle');
    }}
>
    <span class="name">{source.getNames()} </span>
    {#if primaryCount > 0}<span class="count primary">{primaryCount}</span>{/if}
    {#if secondaryCount > 0}<span class="count secondary">{secondaryCount}</span
        >{/if}
    <OutputView {project} {source} {latest} mode="mini" />
</div>

<style>
    .mini {
        width: auto;
        user-select: none;
        display: flex;
        flex-direction: row;
        align-items: center;
        overflow: hidden;
        cursor: pointer;
        gap: var(--wordplay-spacing);
    }

    .mini:focus {
        outline: none;
        color: var(--wordplay-highlight);
    }

    .count {
        font-size: small;
        border-radius: 50%;
        padding: var(--wordplay-spacing);
        color: var(--wordplay-background);
        min-width: 2.25em;
        text-align: center;
    }

    .primary {
        background-color: var(--wordplay-error);
    }

    .secondary {
        background-color: var(--wordplay-warning);
    }
</style>
