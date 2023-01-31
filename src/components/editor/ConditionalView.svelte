<svelte:options immutable={true} />

<script lang="ts">
    import type Conditional from '@nodes/Conditional';
    import NodeView from './NodeView.svelte';

    export let node: Conditional;
</script>

<span class="condition"
    ><NodeView node={node.condition} /><NodeView node={node.question} /></span
><NodeView node={node.yes} /><NodeView node={node.no} />
