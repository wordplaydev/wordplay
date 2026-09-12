<script lang="ts">
    import type Borrow from '@nodes/Borrow';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Borrow;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<!-- `external` is drawn beside `source` because the two are mutually exclusive: a borrow
     names either a kit (`↓ @amy/colors 3`) or a source in this project (`↓ colors`). This
     view names every field it draws, so a field it doesn't name is invisible — which is
     exactly what happened to kit references until this was added. -->
{#if format.block}
    <NodeView node={[node, 'borrow']} {format} /><NodeView
        node={[node, 'external']}
        {format}
        empty="hide"
    /><NodeView
        node={[node, 'source']}
        {format}
        empty={node.external ? 'hide' : 'label'}
    />{#if node}<NodeView
            node={[node, 'dot']}
            {format}
            empty="hide"
        />{/if}{#if node.source}<NodeView
            node={[node, 'name']}
            {format}
            empty="label"
        /><NodeView node={[node, 'version']} {format} empty="hide" />{/if}
{:else}
    <NodeView node={[node, 'borrow']} {format} /><NodeView
        node={[node, 'external']}
        {format}
        empty="hide"
    /><NodeView
        node={[node, 'source']}
        {format}
        empty={node.external ? 'hide' : 'label'}
    /><NodeView node={[node, 'dot']} {format} empty="hide" /><NodeView
        node={[node, 'name']}
        {format}
        empty={node.external ? 'hide' : 'label'}
    /><NodeView node={[node, 'version']} {format} empty="hide" />
{/if}
