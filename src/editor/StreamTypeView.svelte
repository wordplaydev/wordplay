<svelte:options immutable={true} />

<script lang="ts">
    import type StreamType from '../nodes/StreamType';
    import NodeView from './NodeView.svelte';

    export let node: StreamType;
</script>

<NodeView node={node.stream} /><NodeView node={node.type} />
