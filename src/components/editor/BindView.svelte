<svelte:options immutable={true} />

<script lang="ts">
    import type Bind from '@nodes/Bind';
    import NodeView from './NodeView.svelte';

    export let node: Bind;
</script>

<NodeView node={node.docs} /><NodeView node={node.share} /><NodeView
    node={node.names}
/><NodeView node={node.etc} /><span class="type"
    >{#if node.type}<NodeView node={node.dot} /><NodeView
            node={node.type}
        />{/if}</span
><strong><NodeView node={node.colon} /></strong>{#if node.value}<NodeView
        node={node.value}
    />{/if}

<style>
    .type {
        font-style: italic;
        font-size: smaller;
    }
</style>
