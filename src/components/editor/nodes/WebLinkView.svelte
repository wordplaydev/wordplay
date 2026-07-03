<script lang="ts">
    import type WebLink from '@nodes/WebLink';
    import { getCaret } from '@components/project/Contexts';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: WebLink;
        format: Format;
    }

    let { node, format }: Props = $props();

    let caret = getCaret();
    let editing = $derived($caret?.isIn(node, true));
</script>

{#if editing}
    <NodeView node={[node, 'open']} {format} /><NodeView
        node={[node, 'description']}
        {format}
    /><NodeView node={[node, 'at']} {format} /><NodeView
        node={[node, 'url']}
        {format}
    /><NodeView node={[node, 'close']} {format} />
{:else}
    <!-- Stop pointerdown so the editor doesn't place the caret and re-render the anchor away before the click navigates. -->
    <a
        href={node.url?.getText()}
        target="_blank"
        rel="noreferrer"
        onpointerdown={(event) => event.stopPropagation()}
        >{node.description?.getText() ?? ''}</a
    >
{/if}
