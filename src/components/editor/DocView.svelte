<svelte:options immutable={true} />

<script lang="ts">
    import type Doc from '@nodes/Doc';
    import NodeView from './NodeView.svelte';

    export let node: Doc;
</script>

<NodeView node={node.open} /><NodeView node={node.markup} /><NodeView
    node={node.close}
/><NodeView node={node.language} /><NodeView node={node.separator} />
