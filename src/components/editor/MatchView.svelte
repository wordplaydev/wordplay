<svelte:options immutable={true} />

<script lang="ts">
    import type Match from '@nodes/Match';
    import NodeView from './NodeView.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';

    export let node: Match;
</script>

<span class="condition"
    ><NodeView node={node.value} /><NodeView node={node.question} /></span
><NodeSequenceView nodes={node.cases} /><NodeView node={node.other} />
