<script lang="ts">
    import type WebLink from '@nodes/WebLink';
    import { getCaret } from '@components/project/Contexts';
    import linkHref from '@parser/linkHref';
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
    // Undefined for a scheme documentation has no business linking to; the
    // description then renders as plain text, the same as in the guide.
    let href = $derived(node.url ? linkHref(node.url.getText()) : undefined);
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
    {#if href !== undefined}
        <a
            {href}
            target="_blank"
            rel="noreferrer"
            onpointerdown={(event) => event.stopPropagation()}
            >{node.description?.getText() ?? ''}</a
        >
    {:else}{node.description?.getText() ?? ''}{/if}
{/if}
