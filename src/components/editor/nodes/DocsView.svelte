<script lang="ts">
    import type Docs from '@nodes/Docs';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';

    interface DocsProps {
        node: Docs;
        format: Format;
        folded?: boolean;
    }

    let { node, format, folded = false }: DocsProps = $props();

    // Docs fold on their own when they span more than one line, independent of
    // the node they document.
    let foldable = $derived(
        format.editable && isFoldableNode(node, format.spaces),
    );
    let headerFormat = $derived({ ...format, editable: false });
    // The first doc stays visible when collapsed; the … stands in for the rest.
    let first = $derived(node.docs[0]);
</script>

{#if folded && foldable && first !== undefined}
    <!-- Collapsed: the first doc, then … in place of the remaining docs. -->
    {#if format.block}
        <Flow direction="row"
            ><FoldToggle {node} /><NodeView
                node={first}
                format={headerFormat}
            /><FoldEllipsis {node} /></Flow
        >
    {:else}<FoldToggle {node} /><NodeView
            node={first}
            format={headerFormat}
        /><FoldEllipsis {node} />{/if}
{:else}{#if foldable}<FoldToggle {node} />{/if}<NodeSequenceView
        {node}
        field="docs"
        empty="menu"
        {format}
        direction="block"
    />{/if}
