<script lang="ts">
    import type Match from '@nodes/Match';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';

    interface Props {
        node: Match;
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
    <!-- Collapsed: value + ??? + …, hiding the cases and the other branch. -->
    {#if format.block}
        <Flow direction="row"
            ><FoldToggle {node} /><NodeView
                node={[node, 'value']}
                format={headerFormat}
            /><NodeView
                node={[node, 'question']}
                format={headerFormat}
            /><FoldEllipsis {node} /></Flow
        >
    {:else}<FoldToggle {node} /><NodeView
            node={[node, 'value']}
            format={headerFormat}
        /><NodeView
            node={[node, 'question']}
            format={headerFormat}
        /><FoldEllipsis {node} />{/if}
{:else if format.block}
    <Flow direction="row">
        {#if foldable}<FoldToggle {node} />{/if}<NodeView
            node={[node, 'value']}
            {format}
        /><NodeView node={[node, 'question']} {format} />
    </Flow>
    <Flow direction="column" indent>
        <NodeSequenceView
            direction="block"
            {node}
            field="cases"
            {format}
            empty="label"
        /><NodeView node={[node, 'other']} {format} />
    </Flow>
{:else}
    {#if foldable}<FoldToggle {node} />{/if}<NodeView
        node={[node, 'value']}
        {format}
    /><NodeView node={[node, 'question']} {format} /><NodeSequenceView
        {node}
        field="cases"
        {format}
        empty="label"
    /><NodeView node={[node, 'other']} {format} />
{/if}
