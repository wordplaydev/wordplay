<script lang="ts">
    import type Block from '@nodes/Block';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';

    interface Props {
        node: Block;
        format: Format;
        folded?: boolean;
    }

    let { node, format, folded = false }: Props = $props();

    // Don't fold the root block — that's the whole program.
    let foldable = $derived(
        format.editable && isFoldableNode(node, format.spaces),
    );
    let headerFormat = $derived({ ...format, editable: false });
</script>

{#snippet docs()}
    <!-- We don't show the menu trigger, since it takes up space and can be added by selecting the block and adding docs there. -->
    <NodeView node={[node, 'docs']} {format} empty={'menu'} />
{/snippet}

{#snippet statements()}
    {#if foldable}<FoldToggle {node} />{/if}<NodeView
        node={[node, 'open']}
        {format}
        empty="hide"
    /><NodeSequenceView
        {node}
        field="statements"
        {format}
        empty="label"
        direction={node.isRoot() || node.statements.length > 1
            ? 'block'
            : 'inline'}
        breaks={node.isRoot() || node.statements.length > 1}
    /><NodeView node={[node, 'close']} {format} empty="hide" />
{/snippet}

{#if folded && foldable}
    <!-- Collapsed: just the brackets with a "…" for the statements. The docs (if
         any) stay above/before the collapsed header and fold on their own. -->
    {#if format.block}
        {#if !node.docs.isEmpty()}{@render docs()}{/if}
        <Flow direction="row"
            ><FoldToggle {node} /><NodeView
                node={[node, 'open']}
                format={headerFormat}
                empty="hide"
            /><FoldEllipsis {node} /><NodeView
                node={[node, 'close']}
                format={headerFormat} noSpace
                empty="hide"
            /></Flow
        >
    {:else}{#if !node.docs.isEmpty()}{@render docs()}{/if}<NodeView
            node={[node, 'open']}
            format={headerFormat}
            empty="hide"
            foldToggleFor={node}
        /><FoldEllipsis {node} /><NodeView
            node={[node, 'close']}
            format={headerFormat} noSpace
            empty="hide"
        />{/if}
{:else if format.block}
    {#if node.docs.isEmpty()}
        <Flow direction="row">
            {#if format.editable && !node.isRoot()}{@render docs()}{/if}
            <Flow direction={node.statements.length > 1 ? 'column' : 'row'}
                >{@render statements()}
            </Flow>
        </Flow>
    {:else}
        <Flow
            direction={node.statements.length > 1 || !node.docs.isEmpty()
                ? 'column'
                : 'row'}
            >{@render docs()}{@render statements()}
        </Flow>
    {/if}
{:else}
    {#if !(node.isRoot() && node.docs.isEmpty())}<NodeView
            node={[node, 'docs']}
            {format}
            empty="menu"
        />{/if}<NodeView
        node={[node, 'open']}
        {format}
        empty="hide"
        foldToggleFor={foldable ? node : undefined}
    /><NodeSequenceView
        {node}
        field="statements"
        {format}
        empty="label"
        direction={node.isRoot() ? 'block' : 'inline'}
    /><NodeView node={[node, 'close']} {format} empty="hide" />
{/if}
