<svelte:options immutable={true} />

<script lang="ts">
    import type NoneType from '@nodes/NoneType';
    import NodeView from './NodeView.svelte';

    export let node: NoneType;
</script>

<NodeView node={node.none} />
