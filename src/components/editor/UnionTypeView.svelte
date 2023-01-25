<svelte:options immutable={true} />

<script lang="ts">
    import type UnionType from '@nodes/UnionType';
    import NodeView from './NodeView.svelte';

    export let node: UnionType;
</script>

<NodeView node={node.left} /><NodeView node={node.or} /><NodeView
    node={node.right}
/>
