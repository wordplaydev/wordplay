<svelte:options immutable={true} />

<script lang="ts">
    import type Input from '@nodes/Input';
    import NodeView from './NodeView.svelte';

    export let node: Input;
</script>

<NodeView node={node.name} /><NodeView node={node.bind} /><NodeView
    node={node.value}
/>
