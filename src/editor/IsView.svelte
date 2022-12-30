<svelte:options immutable={true} />

<script lang="ts">
    import type Is from '../nodes/Is';
    import NodeView from './NodeView.svelte';

    export let node: Is;
</script>

<NodeView node={node.expression} /><NodeView node={node.operator} /><NodeView
    node={node.type}
/>
