<script lang="ts">
    import type Block from '@nodes/Block';
    import Flow from '../blocks/Flow.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Block;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#snippet docs()}
    <!-- We don't show the menu trigger, since it takes up space and can be added by selecting the block and adding docs there. -->
    <NodeView node={[node, 'docs']} {format} empty={'menu'} />
{/snippet}

{#snippet statements()}
    <NodeView node={[node, 'open']} {format} empty="hide" /><NodeSequenceView
        {node}
        field="statements"
        {format}
        empty="label"
        direction={node.isRoot() || node.statements.length > 1
            ? 'block'
            : 'inline'}
    /><NodeView node={[node, 'close']} {format} empty="hide" />
{/snippet}

{#if format.block}
    {#if node.docs.isEmpty()}
        <Flow direction="row">
            {#if format.editable}{@render docs()}{/if}
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
    <NodeView node={[node, 'docs']} {format} empty="menu" /><NodeView
        node={[node, 'open']}
        {format}
        empty="hide"
    /><NodeSequenceView
        {node}
        field="statements"
        {format}
        empty="label"
        direction={node.isRoot() ? 'block' : 'inline'}
    /><NodeView node={[node, 'close']} {format} empty="hide" />
{/if}
