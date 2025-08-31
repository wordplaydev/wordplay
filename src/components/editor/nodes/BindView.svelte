<script lang="ts">
    import type Bind from '@nodes/Bind';
    import Block from '../blocks/Block.svelte';
    import Delimiter from '../blocks/Delimiter.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Bind;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <Block style="none">
        <NodeView node={node.docs} {format} />
        <Block inline style="definition">
            <NodeView node={node.share} {format} />
            <NodeView node={node.names} {format} />
            <NodeView node={node.etc} {format} />
            <span class="type">
                <NodeView node={node.dot} {format} />
                <NodeView node={node.type} {format} />
            </span>
            <Delimiter token={node.colon} {format} />
            {#if node.value}<NodeView node={node.value} {format} />{/if}
        </Block>
    </Block>
{:else}
    <NodeView node={node.docs} {format} /><NodeView
        node={node.share}
        {format}
    /><NodeView node={node.names} {format} /><NodeView
        node={node.etc}
        {format}
    /><span class="type"
        ><NodeView node={node.dot} {format} /><NodeView
            node={node.type}
            {format}
        /></span
    ><strong><NodeView node={node.colon} {format} /></strong
    >{#if node.value}<NodeView node={node.value} {format} />{/if}
{/if}

<style>
    .type {
        font-style: italic;
        font-size: smaller;
    }
</style>
