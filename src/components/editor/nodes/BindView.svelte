<script lang="ts">
    import type Bind from '@nodes/Bind';
    import Flow from '../blocks/Flow.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Bind;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    {#if !node.docs.isEmpty()}
        <NodeView node={[node, 'docs']} {format} empty="menu" />
    {/if}
    <Flow direction="row">
        {#if node.docs.isEmpty()}
            <NodeView node={[node, 'docs']} {format} empty="menu" />
        {/if}
        <NodeView node={[node, 'share']} {format} empty="hide" />
        <NodeView node={[node, 'names']} {format} />
        <NodeView node={[node, 'etc']} {format} empty="hide" />
        <NodeView node={[node, 'dot']} {format} empty="hide" />
        <NodeView node={[node, 'type']} {format} empty="menu" />
        <NodeView node={[node, 'colon']} {format} empty="hide" />
        <NodeView node={[node, 'value']} {format} />
    </Flow>
{:else}
    <NodeView node={[node, 'docs']} {format} /><NodeView
        node={[node, 'share']}
        {format}
    /><NodeView node={[node, 'names']} {format} /><NodeView
        node={[node, 'etc']}
        {format}
    /><span class="type"
        ><NodeView node={[node, 'dot']} {format} /><NodeView
            node={[node, 'type']}
            {format}
        /></span
    ><strong><NodeView node={[node, 'colon']} {format} /></strong
    >{#if node.value}<NodeView node={[node, 'value']} {format} />{/if}
{/if}
