<svelte:options immutable={true} />

<script lang="ts">
    import type BooleanLiteral from '@nodes/BooleanLiteral';
    import NodeView from './NodeView.svelte';

    export let node: BooleanLiteral;
</script>

<NodeView node={node.value} />
