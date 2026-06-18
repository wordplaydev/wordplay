<script lang="ts">
    import type PatternBackref from '@nodes/PatternBackref';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import MenuTrigger from '@components/editor/menu/MenuTrigger.svelte';

    /** A bare-name reference to an earlier capture (or a known class). An
     *  empty-name backref is the parser's placeholder for a missing atom; in
     *  blocks mode we render it as a clickable slot (a replace menu anchored at
     *  the node) so the atom palette is reachable, rather than an invisible empty
     *  token. In text mode the caret can reach the same position directly. */
    interface Props {
        node: PatternBackref;
        format: Format;
    }

    let { node, format }: Props = $props();

    let isSlot = $derived(node.isPlaceholder() && format.block && format.editable);
</script>

{#if isSlot}
    <span class="slot"><MenuTrigger anchor={node} /></span>
{:else}
    <NodeView node={[node, 'name']} {format} />
{/if}

<style>
    .slot {
        display: inline-flex;
        align-items: center;
        min-width: var(--wordplay-min-line-height);
        min-height: var(--wordplay-min-line-height);
        border-radius: var(--wordplay-border-radius);
        border-bottom: solid var(--wordplay-focus-width)
            var(--wordplay-border-color);
    }
</style>
