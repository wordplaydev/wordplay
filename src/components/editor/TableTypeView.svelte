<svelte:options immutable={true} />

<script lang="ts">
    import type TableType from '@nodes/TableType';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    export let node: TableType;
</script>

<NodeView node={node.open} /><NodeSequenceView nodes={node.columns} /><NodeView
    node={node.close}
/>
