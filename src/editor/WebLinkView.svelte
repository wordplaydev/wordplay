<svelte:options immutable={true} />

<script lang="ts">
    import type WebLink from '../nodes/WebLink';
    import NodeView from './NodeView.svelte';
    import { getCaret } from './util/Contexts';

    export let node: WebLink;

    let caret = getCaret();
    $: editing = $caret?.isIn(node);
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
