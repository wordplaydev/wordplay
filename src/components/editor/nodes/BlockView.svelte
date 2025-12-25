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
    <NodeView
        node={[node, 'docs']}
        {format}
        empty={node.isRoot() ? 'menu' : 'hide'}
    />
{/snippet}

{#snippet statements()}
    <NodeView node={[node, 'open']} {format} empty="hide" /><NodeSequenceView
        {node}
        field="statements"
        {format}
        empty="label"
        block={node.isRoot() ||
            node.statements.reduce((sum, v) => sum + v.toWordplay().length, 0) >
                32}
    /><NodeView node={[node, 'close']} {format} empty="hide" />
{/snippet}

{#if format.block}
    {#if node.docs === undefined || node.docs.docs.length === 0}
        <Flow direction={node.statements.length > 1 ? 'column' : 'row'}>
            {#if format.editable}{@render docs()}{/if}
            <Flow direction={node.statements.length > 1 ? 'column' : 'row'}
                >{@render statements()}
            </Flow>
        </Flow>
    {:else}
        <Flow
            direction={node.statements.length > 1 || node.docs !== undefined
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
        block={node.isRoot()}
    /><NodeView node={[node, 'close']} {format} empty="hide" />
{/if}
