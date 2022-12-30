<svelte:options immutable={true} />

<script lang="ts">
    import type Select from '../nodes/Select';
    import NodeView from './NodeView.svelte';

    export let node: Select;
</script>

<NodeView node={node.table} /><NodeView node={node.select} /><NodeView
    node={node.row}
/><NodeView node={node.query} />
