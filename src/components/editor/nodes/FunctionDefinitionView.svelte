<script lang="ts">
    import type FunctionDefinition from '@nodes/FunctionDefinition';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isVerticalList } from '@components/editor/nodes/verticalLayout';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';

    interface Props {
        node: FunctionDefinition;
        format: Format;
        folded?: boolean;
    }

    let { node, format, folded = false }: Props = $props();

    let vertical = $derived(
        format.block && isVerticalList(node.inputs, format.spaces),
    );

    // This view supports folding when it spans more than one line.
    let foldable = $derived(
        format.editable && isFoldableNode(node, format.spaces),
    );
    // The folded header is non-interactive (the whole fold is selected as a
    // unit), so render its tokens as read-only — no editable border/cursor.
    let headerFormat = $derived({ ...format, editable: false });
</script>

{#snippet docs(fmt: Format)}
    <NodeView node={[node, 'docs']} format={fmt} empty="menu" /><NodeView
        node={[node, 'share']}
        format={fmt}
        empty="hide"
    />
{/snippet}

<!-- The signature head (fun keyword, names, type variables, open paren) and tail
     (close paren, dot, output type) — reused by the full and folded renderings. -->
{#snippet head(fmt: Format, toggleFor: typeof node | undefined)}<NodeView
        node={[node, 'fun']}
        format={fmt}
        foldToggleFor={toggleFor}
    /><NodeView node={[node, 'names']} format={fmt} /><NodeView
        node={[node, 'types']}
        format={fmt}
        empty="hide"
    /><NodeView node={[node, 'open']} format={fmt} />{/snippet}
{#snippet tail(fmt: Format, collapse: boolean)}<NodeView
        node={[node, 'close']}
        format={fmt}
        noSpace={collapse}
    /><NodeView node={[node, 'dot']} format={fmt} empty="hide" /><NodeView
        node={[node, 'output']}
        format={fmt}
        empty="hide"
    />{/snippet}

{#if folded && foldable}
    <!-- Collapsed: keyword + name + () + …, with the ellipsis after the closing
         parenthesis, hiding the inputs and body. Block mode lays it out as a
         row; text mode stays inline. The docs (if any) stay above/before the
         collapsed header and fold on their own. -->
    {#if format.block}
        {#if !node.docs.isEmpty()}{@render docs(format)}{/if}
        <Flow direction="row"
            ><FoldToggle {node} />{@render head(
                headerFormat,
                undefined,
            )}{@render tail(headerFormat, true)}<FoldEllipsis {node} /></Flow
        >
    {:else}{#if !node.docs.isEmpty()}{@render docs(
                format,
            )}{/if}{@render head(headerFormat, node)}{@render tail(
            headerFormat,
            true,
        )}<FoldEllipsis {node} />{/if}
{:else if format.block}
    {#if !node.docs.isEmpty()}{@render docs(format)}{/if}
    {#if vertical}
        <Flow direction="column">
            <Flow direction="row"
                >{#if foldable}<FoldToggle {node} />{/if}{#if node.docs.isEmpty()}{@render docs(
                            format,
                        )}{/if}{@render head(format, undefined)}</Flow
            >
            <Flow direction="row" indent>
                <NodeSequenceView
                    {node}
                    field="inputs"
                    {format}
                    empty="menu"
                    direction="block"
                    wrap={false}
                    breaks
                />
            </Flow>
            <Flow direction="row">{@render tail(format, false)}</Flow>
        </Flow>
    {:else}
        <Flow direction="row"
            >{#if foldable}<FoldToggle {node} />{/if}{#if node.docs.isEmpty()}{@render docs(
                        format,
                    )}{/if}{@render head(format, undefined)}<NodeSequenceView
                {node}
                field="inputs"
                {format}
                empty="menu"
                direction="inline"
                wrap
                breaks
            />{@render tail(format, false)}</Flow
        >
    {/if}
    <Flow direction="column" indent>
        <NodeView node={[node, 'expression']} {format} empty="label" />
    </Flow>
{:else}
    <NodeView node={[node, 'docs']} {format} /><NodeView
        node={[node, 'share']}
        {format}
    />{@render head(format, foldable ? node : undefined)}<NodeSequenceView
        {node}
        field="inputs"
        {format}
        empty="menu"
    />{@render tail(format, false)}<NodeView node={[node, 'expression']} {format} />
{/if}
