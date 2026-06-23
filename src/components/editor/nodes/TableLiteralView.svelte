<script lang="ts">
    import type TableLiteral from '@nodes/TableLiteral';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';

    interface Props {
        node: TableLiteral;
        format: Format;
        folded?: boolean;
    }

    let { node, format, folded = false }: Props = $props();

    // Foldable when multi-line or when it has many rows.
    let foldable = $derived(
        format.editable && isFoldableNode(node, format.spaces),
    );
    let headerFormat = $derived({ ...format, editable: false });
</script>

{#if folded && foldable}<!-- Collapsed: the column header + …, hiding the rows. --><FoldToggle
        {node}
    /><NodeView node={[node, 'type']} format={headerFormat} /><FoldEllipsis
        {node}
        count={node.rows.length}
    />{:else}{#if foldable}<FoldToggle {node} />{/if}<NodeView
        node={[node, 'type']}
        {format}
    /><NodeSequenceView
        {node}
        direction={node.rows.length > 1 ? 'block' : 'inline'}
        field="rows"
        {format}
        empty="label"
    />{/if}
