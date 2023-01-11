<svelte:options immutable={true} />

<script lang="ts">
    import type Example from '../nodes/Example';
    import NodeView from './NodeView.svelte';

    export let node: Example;
</script>

<NodeView node={node.open} /><NodeView node={node.program} /><NodeView
    node={node.close}
/>
