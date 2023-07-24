<svelte:options immutable={true} />

<script lang="ts">
    import type UnparsableExpression from '@nodes/UnparsableExpression';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';
    import ExpressionPlaceholder from '../../nodes/ExpressionPlaceholder';

    export let node: UnparsableExpression;
</script>

{#if node.unparsables.length === 0}&nbsp;<NodeView
        node={ExpressionPlaceholder.make()}
    />{:else}<NodeSequenceView nodes={node.unparsables} />{/if}
