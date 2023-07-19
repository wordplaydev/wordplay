<svelte:options immutable={true} />

<script lang="ts">
    import type UnaryEvaluate from '@nodes/UnaryEvaluate';
    import NodeView from './NodeView.svelte';

    export let node: UnaryEvaluate;
</script>

<NodeView node={node.fun} /><NodeView node={node.input} />
