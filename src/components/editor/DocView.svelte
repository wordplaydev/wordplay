<svelte:options immutable={true} />

<script lang="ts">
    import type Doc from '@nodes/Doc';
    import NodeView from './NodeView.svelte';

    export let node: Doc;
</script>

<span class="doc"
    ><NodeView node={node.open} /><NodeView node={node.markup} /><NodeView
        node={node.close}
    /><NodeView node={node.lang} /></span
>

<style>
    .doc {
        color: var(--wordplay-doc-color);
    }
</style>
