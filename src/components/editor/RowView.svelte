<svelte:options immutable={true} />

<script lang="ts">
    import type Row from '@nodes/Row';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';
    export let node: Row;
</script>

<NodeView node={node.open} /><NodeSequenceView nodes={node.cells} /><NodeView
    node={node.close}
/>
