<script lang="ts">
    import type WebLink from '@nodes/WebLink';
    import { getCaret } from '../../project/Contexts';
    import NodeView, { type Format } from './NodeView.svelte';

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
    <a href={node.url?.getText()} target="_blank" rel="noreferrer"
        >{node.description?.getText() ?? ''}</a
    >
{/if}
