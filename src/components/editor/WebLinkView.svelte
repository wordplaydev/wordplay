<script lang="ts">
    import type WebLink from '@nodes/WebLink';
    import { getCaret } from '../project/Contexts';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: WebLink;
    }

    let { node }: Props = $props();

    let caret = getCaret();
    let editing = $derived($caret?.isIn(node, true));
</script>

{#if editing}
    <NodeView node={node.open} /><NodeView node={node.description} /><NodeView
        node={node.at}
    /><NodeView node={node.url} /><NodeView node={node.close} />
{:else}
    <a href={node.url?.getText()} target="_blank" rel="noreferrer"
        >{node.description?.getText() ?? ''}</a
    >
{/if}
