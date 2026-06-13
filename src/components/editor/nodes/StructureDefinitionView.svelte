<script lang="ts">
    import type StructureDefinition from '@nodes/StructureDefinition';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';

    interface Props {
        node: StructureDefinition;
        format: Format;
        folded?: boolean;
    }

    let { node, format, folded = false }: Props = $props();

    let foldable = $derived(
        format.editable && isFoldableNode(node, format.spaces),
    );
    let headerFormat = $derived({ ...format, editable: false });
</script>

{#snippet docs(fmt: Format)}
    <NodeView node={[node, 'docs']} format={fmt} empty="menu" />
{/snippet}

<!-- Header up to the open paren, and the closing paren — reused by the full and
     folded renderings. -->
{#snippet head(fmt: Format, toggleFor: typeof node | undefined)}<NodeView
        node={[node, 'share']}
        format={fmt}
        empty="hide"
    /><NodeView
        node={[node, 'type']}
        format={fmt}
        empty="hide"
        foldToggleFor={toggleFor}
    /><NodeView node={[node, 'names']} format={fmt} /><NodeSequenceView
        {node}
        field="interfaces"
        format={fmt}
        empty="menu"
    /><NodeView node={[node, 'types']} format={fmt} empty="hide" /><NodeView
        node={[node, 'open']}
        format={fmt}
    />{/snippet}

{#if folded && foldable}
    <!-- Collapsed: header + () + …, with the ellipsis after the closing
         parenthesis of the inputs, hiding the inputs and body. The docs (if any)
         stay above/before the collapsed header and fold on their own. -->
    {#if format.block}
        {#if !node.docs.isEmpty()}{@render docs(format)}{/if}
        <Flow direction="row"
            ><FoldToggle {node} />{@render head(headerFormat, undefined)}<NodeView
                node={[node, 'close']}
                format={headerFormat}
                noSpace
            /><FoldEllipsis {node} /></Flow
        >
    {:else}{#if !node.docs.isEmpty()}{@render docs(
                format,
            )}{/if}{@render head(headerFormat, node)}<NodeView
            node={[node, 'close']}
            format={headerFormat}
            noSpace
        /><FoldEllipsis {node} />{/if}
{:else if format.block}
    <Flow direction="column">
        {#if !node.docs.isEmpty()}{@render docs(format)}{/if}
        <Flow direction="row">
            {#if foldable}<FoldToggle {node} />{/if}{#if node.docs.isEmpty()}{@render docs(
                    format,
                )}{/if}{@render head(format, undefined)}<NodeSequenceView
                {node}
                field="inputs"
                {format}
                empty="label"
                breaks
            /><NodeView node={[node, 'close']} {format} />
            {#if node.expression === undefined}<NodeView
                    node={[node, 'expression']}
                    {format}
                />{/if}
        </Flow>
        {#if node.expression !== undefined}
            <Flow direction="column" indent
                ><NodeView node={[node, 'expression']} {format} /></Flow
            >
        {/if}
    </Flow>
{:else}
    <NodeView node={[node, 'docs']} {format} />{@render head(
        format,
        foldable ? node : undefined,
    )}<NodeSequenceView
        {node}
        field="inputs"
        {format}
        empty="label"
    /><NodeView node={[node, 'close']} {format} /><NodeView
        node={[node, 'expression']}
        {format}
    />
{/if}
