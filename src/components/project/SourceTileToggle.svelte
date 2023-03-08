<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type Source from '@nodes/Source';
    import type Value from '@runtime/Value';
    import OutputView from '../output/OutputView.svelte';
    import { getConflicts, getCurrentStep } from './Contexts';
    import type Evaluator from '@runtime/Evaluator';
    import type Project from '../../models/Project';

    export let project: Project;
    export let evaluator: Evaluator;
    export let source: Source;
    export let output: boolean;
    export let expanded: boolean;

    let currentStep = getCurrentStep();
    let conflicts = getConflicts();

    const dispatch = createEventDispatcher();

    let latest: Value | undefined;
    $: {
        $currentStep;
        latest = evaluator.getLatestSourceValue(source);
    }

    // The number of conflicts is the number of nodes in the source involved in conflicts
    let primaryCount = 0;
    let secondaryCount = 0;
    $: {
        primaryCount = 0;
        secondaryCount = 0;
        if ($conflicts) {
            for (const conflict of $conflicts) {
                const nodes = conflict.getConflictingNodes();
                if (source.has(nodes.primary.node)) {
                    if (!conflict.isMinor()) primaryCount++;
                    else secondaryCount++;
                } else if (
                    nodes.secondary !== undefined &&
                    source.has(nodes.secondary.node)
                )
                    secondaryCount++;
            }
        }
    }
</script>

<div class="mini" class:expanded>
    <span
        class="name"
        tabIndex="0"
        on:click={() => dispatch('toggle')}
        on:keydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                dispatch('toggle');
                event.stopPropagation();
            }
        }}
        >{source.getNames()}
    </span>
    {#if primaryCount > 0}<span class="count primary">{primaryCount}</span>{/if}
    {#if secondaryCount > 0}<span class="count secondary">{secondaryCount}</span
        >{/if}
    {#if output}
        <div class="output">
            <OutputView
                {project}
                {evaluator}
                {source}
                {latest}
                fullscreen={false}
                mode="mini"
            />
        </div>
    {/if}
</div>

<style>
    .mini {
        width: auto;
        user-select: none;
        display: flex;
        flex-direction: row;
        align-items: center;
        overflow: hidden;
        gap: var(--wordplay-spacing);
        padding-left: var(--wordplay-spacing);
        border-left: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
    }

    .name {
        cursor: pointer;
    }

    .name:focus {
        outline: none;
        color: var(--wordplay-highlight);
    }

    .expanded .name {
        font-weight: bold;
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

    .output {
        width: 2em;
        height: 2em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
    }
</style>
