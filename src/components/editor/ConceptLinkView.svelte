<svelte:options immutable={true} />

<script lang="ts">
    import type ConceptLink from '@nodes/ConceptLink';
    import NodeView from './NodeView.svelte';

    export let node: ConceptLink;
</script>

<NodeView node={node.concept} />
