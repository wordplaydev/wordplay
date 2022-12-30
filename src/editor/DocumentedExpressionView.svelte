<svelte:options immutable={true} />

<script lang="ts">
    import type DocumentedExpression from '../nodes/DocumentedExpression';
    import NodeView from './NodeView.svelte';

    export let node: DocumentedExpression;
</script>

<NodeView node={node.docs} /><NodeView node={node.expression} />
