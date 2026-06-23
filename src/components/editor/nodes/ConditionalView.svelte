<script lang="ts">
    import type Conditional from '@nodes/Conditional';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';

    interface Props {
        node: Conditional;
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
    <!-- Collapsed: condition + ? + …, hiding the yes/no branches. -->
    {#if format.block}
        <Flow direction="row"
            ><FoldToggle {node} /><NodeView
                node={[node, 'condition']}
                format={headerFormat}
            /><NodeView
                node={[node, 'question']}
                format={headerFormat}
            /><FoldEllipsis {node} /></Flow
        >
    {:else}<FoldToggle {node} /><NodeView
            node={[node, 'condition']}
            format={headerFormat}
        /><NodeView
            node={[node, 'question']}
            format={headerFormat}
        /><FoldEllipsis {node} />{/if}
{:else if format.block}
    <Flow direction="row">
        {#if foldable}<FoldToggle {node} />{/if}<NodeView
            node={[node, 'condition']}
            {format}
        /><NodeView node={[node, 'question']} {format} />
    </Flow>
    <Flow direction="column" indent>
        <NodeView node={[node, 'yes']} {format} /><NodeView
            node={[node, 'no']}
            {format}
        /></Flow
    >
{:else}
    {#if foldable}<FoldToggle {node} />{/if}<NodeView
        node={[node, 'condition']}
        {format}
    /><NodeView node={[node, 'question']} {format} /><NodeView
        node={[node, 'yes']}
        {format}
    /><NodeView node={[node, 'no']} {format} />
{/if}
