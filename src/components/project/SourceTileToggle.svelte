<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type Source from '@nodes/Source';
    import { getConflicts } from './Contexts';
    import Glyphs from '../../lore/Glyphs';
    import Toggle from '../widgets/Toggle.svelte';
    import { locales } from '../../db/Database';
    import Emoji from '@components/app/Emoji.svelte';

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

<Toggle
    tips={$locales.get((l) => l.ui.tile.toggle.show)}
    on={expanded}
    toggle={() => dispatch('toggle')}
>
    {#if primaryCount > 0}<span class="count primary">{primaryCount}</span>{/if}
    {#if secondaryCount > 0}<span class="count secondary">{secondaryCount}</span
        >{/if}
    {#if primaryCount === 0 && secondaryCount === 0}<Emoji
            >{Glyphs.Program.symbols}</Emoji
        >{/if}
    {$locales.getName(source.names)}
</Toggle>

<style>
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
