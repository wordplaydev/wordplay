<svelte:options immutable={true} />

<script lang="ts">
    import type BinaryEvaluate from '@nodes/BinaryEvaluate';
    import NodeView from './NodeView.svelte';
    import { isBlocks } from '@components/project/Contexts';

    export let node: BinaryEvaluate;

    const blocks = isBlocks();
</script>

{#if $blocks}
    <div class="evaluate">
        <NodeView node={node.left} /><NodeView node={node.fun} /><NodeView
            node={node.right}
        />
    </div>
{:else}
    <NodeView node={node.left} /><NodeView node={node.fun} /><NodeView
        node={node.right}
    />
{/if}

<style>
    .evaluate {
        display: flex;
        flex-direction: row;
        align-items: baseline;
    }
</style>
