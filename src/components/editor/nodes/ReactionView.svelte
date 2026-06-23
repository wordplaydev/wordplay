<script lang="ts">
    import type Reaction from '@nodes/Reaction';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';

    interface Props {
        node: Reaction;
        format: Format;
        folded?: boolean;
    }

    let { node, format, folded = false }: Props = $props();

    let foldable = $derived(
        format.editable && isFoldableNode(node, format.spaces),
    );
    let headerFormat = $derived({ ...format, editable: false });
</script>

{#if folded && foldable}<!-- Collapsed: … condition …, hiding the initial and next values. --><FoldToggle
        {node}
    /><FoldEllipsis {node} /><NodeView
        node={[node, 'condition']}
        format={headerFormat} noSpace
    /><FoldEllipsis {node} />{:else}{#if foldable}<FoldToggle {node} />{/if}<NodeView
        node={[node, 'initial']}
        {format}
    /><NodeView node={[node, 'dots']} {format} /><NodeView
        node={[node, 'condition']}
        {format}
    /><NodeView node={[node, 'nextdots']} {format} /><NodeView
        node={[node, 'next']}
        {format}
    />{/if}
