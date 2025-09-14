<script lang="ts">
    import type Bind from '@nodes/Bind';
    import Row from '../blocks/Row.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Bind;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <NodeView node={node.docs} {format} />
    <Row>
        <NodeView node={node.share} {format} />
        <NodeView node={node.names} {format} />
        <NodeView node={node.etc} {format} />
        <NodeView node={node.dot} {format} />
        <NodeView node={node.type} {format} />
        <NodeView node={node.colon} {format} />
        {#if node.value}<NodeView node={node.value} {format} />{/if}
    </Row>
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
