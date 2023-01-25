<svelte:options immutable={true} />

<script lang="ts">
    import type SetType from '@nodes/SetType';
    import NodeView from './NodeView.svelte';

    export let node: SetType;
</script>

<NodeView node={node.open} /><NodeView node={node.key} /><NodeView
    node={node.close}
/>
