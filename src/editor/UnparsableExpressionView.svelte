<svelte:options immutable={true} />

<script lang="ts">
    import type UnparsableExpression from '../nodes/UnparsableExpression';
    import NodeSequenceView from './NodeSequenceView.svelte';

    export let node: UnparsableExpression;
</script>

<NodeSequenceView nodes={node.unparsables} />
