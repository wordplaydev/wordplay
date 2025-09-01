<script lang="ts">
    import type ListLiteral from '@nodes/ListLiteral';
    import Block from '../blocks/Block.svelte';
    import Delimiter from '../blocks/Delimiter.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: ListLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <Block>
        <Delimiter token={node.open} {format} />
        <NodeSequenceView
            nodes={node.values}
            {format}
            elide
            block={node.values.map((v) => v.toWordplay()).join().length > 40}
        />
        <Delimiter token={node.close} {format} />
        <NodeView node={node.literal} {format} />
    </Block>
{:else}
    <NodeView node={node.open} {format} /><NodeSequenceView
        nodes={node.values}
        {format}
        elide
    /><NodeView node={node.close} {format} /><NodeView
        node={node.literal}
        {format}
    />
{/if}
