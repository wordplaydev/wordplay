<svelte:options immutable={true} />

<script lang="ts">
    import type DocumentedExpression from '@nodes/DocumentedExpression';
    import NodeView from './NodeView.svelte';
    import { isBlocks } from '@components/project/Contexts';

    export let node: DocumentedExpression;

    const blocks = isBlocks();
</script>

{#if $blocks}
    <div class="column">
        <NodeView node={node.docs} /><NodeView node={node.expression} />
    </div>
{:else}
    <NodeView node={node.docs} /><NodeView node={node.expression} />
{/if}

<style>
    .column {
        display: flex;
        flex-direction: row;
    }
</style>
