<svelte:options immutable={true} />

<script lang="ts">
    import type Reaction from '@nodes/Reaction';
    import NodeView from './NodeView.svelte';

    export let node: Reaction;
</script>

<NodeView node={node.condition} /><NodeView node={node.question} /><NodeView
    node={node.initial}
/><NodeView node={node.dots} /><NodeView node={node.next} />
