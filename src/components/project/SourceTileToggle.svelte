<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type Source from '@nodes/Source';
    import { getConflicts } from './Contexts';
    import { locales } from '../../db/Database';
    import Glyphs from '../../lore/Glyphs';

    export let source: Source;
    export let expanded: boolean;

    let conflicts = getConflicts();

    const dispatch = createEventDispatcher();

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
        role="button"
        class="name"
        tabindex="0"
        on:pointerdown={() => dispatch('toggle')}
        on:keydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                dispatch('toggle');
                event.stopPropagation();
            }
        }}
    >
        {#if primaryCount > 0}<span class="count primary">{primaryCount}</span
            >{/if}
        {#if secondaryCount > 0}<span class="count secondary"
                >{secondaryCount}</span
            >{/if}
        {#if primaryCount === 0 && secondaryCount === 0}{Glyphs.Program
                .symbols}{/if}
        {source.names.getPreferredNameString($locales)}
    </span>
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
    }

    .name {
        cursor: pointer;
        padding: var(--wordplay-spacing);
    }

    .name:focus {
        background: var(--wordplay-focus-color);
        color: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
    }

    .expanded .name {
        display: inline-block;
        transform: scale(0.85);
    }

    .count {
        font-size: small;
        border-radius: 50%;
        color: var(--wordplay-background);
        min-width: 2em;
        min-height: 2em;
        display: inline-flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
        vertical-align: middle;
    }

    .primary {
        background-color: var(--wordplay-error);
    }

    .secondary {
        background-color: var(--wordplay-warning);
    }
</style>
