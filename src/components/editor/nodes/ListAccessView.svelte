<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type ListAccess from '@nodes/ListAccess';
    import Block from '../blocks/Block.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: ListAccess;
        format: Format;
    }

    let { node, format }: Props = $props();
    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <Block inline>
        <NodeView node={node.list} {format} /><NodeView
            node={node.open}
            {format}
        /><NodeView node={node.index} {format} /><NodeView
            node={node.close}
            {format}
        />
    </Block>
{:else}
    <NodeView node={node.list} {format} /><NodeView
        node={node.open}
        {format}
    /><NodeView node={node.index} {format} /><NodeView
        node={node.close}
        {format}
    />
{/if}
