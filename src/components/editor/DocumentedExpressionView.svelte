<svelte:options immutable={true} />

<script lang="ts">
    import type DocumentedExpression from '@nodes/DocumentedExpression';
    import NodeView from './NodeView.svelte';

    export let node: DocumentedExpression;
</script>

<div class="column">
    <NodeView node={node.docs} /><NodeView node={node.expression} />
</div>

<style>
    .column {
        display: flex;
        flex-direction: column;
    }
</style>
