<script lang="ts">
    import type Block from '@nodes/Block';
    import BlockUI from '../blocks/Block.svelte';
    import Delimiter from '../blocks/Delimiter.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Block;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <BlockUI
        inline={node.statements.length === 1}
        style={node.open === undefined ? 'none' : 'back'}
    >
        <NodeView node={node.docs} {format} />
        <Delimiter token={node.open} {format} />
        <NodeSequenceView
            nodes={node.statements}
            block={node.statements.length > 1}
            indent
            {format}
        />
        <Delimiter token={node.close} {format} />
    </BlockUI>
{:else}
    <NodeView node={node.docs} {format} /><NodeView
        node={node.open}
        {format}
    /><NodeSequenceView nodes={node.statements} {format} /><NodeView
        node={node.close}
        {format}
    />
{/if}
