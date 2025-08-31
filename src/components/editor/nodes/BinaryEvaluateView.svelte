<script lang="ts">
    import type BinaryEvaluate from '@nodes/BinaryEvaluate';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: BinaryEvaluate;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <div class="evaluate">
        <NodeView node={node.left} {format} /><NodeView
            node={node.fun}
            {format}
        /><NodeView node={node.right} {format} />
    </div>
{:else}
    <NodeView node={node.left} {format} /><NodeView
        node={node.fun}
        {format}
    /><NodeView node={node.right} {format} />
{/if}

<style>
    .evaluate {
        display: flex;
        flex-direction: row;
        align-items: baseline;
    }
</style>
