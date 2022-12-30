<svelte:options immutable={true} />

<script lang="ts">
    import type KeyValue from '../nodes/KeyValue';
    import NodeView from './NodeView.svelte';

    export let node: KeyValue;
</script>

<NodeView node={node.key} /><NodeView node={node.bind} /><NodeView
    node={node.value}
/>
