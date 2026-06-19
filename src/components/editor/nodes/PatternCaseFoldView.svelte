<script lang="ts">
    import type PatternCaseFold from '@nodes/PatternCaseFold';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';
    import CollapsedHeader from '@components/editor/util/CollapsedHeader.svelte';

    /** A case-folded scope `Aa( … )` (optionally locale-tagged). The fold glyph
     *  and any language tag stay visible when collapsed. */
    interface Props {
        node: PatternCaseFold;
        format: Format;
        folded?: boolean;
    }

    let { node, format, folded = false }: Props = $props();

    let foldable = $derived(
        format.editable && isFoldableNode(node, format.spaces),
    );
    let headerFormat = $derived({ ...format, editable: false });
</script>

{#if folded && foldable}
    <CollapsedHeader block={format.block}>
        {#snippet header()}<FoldToggle {node} /><NodeView
                node={[node, 'fold']}
                format={headerFormat}
            /><NodeView
                node={[node, 'language']}
                format={headerFormat}
                empty="hide"
            /><NodeView
                node={[node, 'open']}
                format={headerFormat}
            /><FoldEllipsis {node} count={node.body.items.length} /><NodeView
                node={[node, 'close']}
                format={headerFormat}
                noSpace
            />{/snippet}
    </CollapsedHeader>
{:else}
    {#if foldable}<FoldToggle {node} />{/if}<NodeView
        node={[node, 'fold']}
        {format}
    /><NodeView
        node={[node, 'language']}
        {format}
        empty="hide"
    /><NodeView node={[node, 'open']} {format} /><NodeView
        node={[node, 'body']}
        {format}
    /><NodeView node={[node, 'close']} {format} />
{/if}
