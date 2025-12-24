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
    <NodeView node={[node, 'docs']} {format} empty="menu" />
{/snippet}

{#if format.block}
    {#if node.docs === undefined || node.docs.docs.length === 0}
        <Flow direction={node.statements.length > 1 ? 'column' : 'row'}>
            {#if format.editable}{@render docs()}{/if}
            <Flow direction={node.statements.length > 1 ? 'column' : 'row'}
                ><NodeView
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
            </Flow>
        </Flow>
    {:else}
        <Flow direction={node.statements.length > 1 ? 'column' : 'row'}
            >{@render docs()}<NodeView
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
