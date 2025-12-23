<script lang="ts">
    import type Block from '@nodes/Block';
    import Column from '../blocks/Column.svelte';
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
    {#if format.editable && node.docs}{@render docs()}{/if}
    <Column
        >{#if format.editable && node.docs === undefined}{@render docs()}{/if}<NodeView
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
    </Column>
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
