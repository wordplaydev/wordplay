<svelte:options immutable={true} />

<script lang="ts">
    import type Conditional from '@nodes/Conditional';
    import NodeView from './NodeView.svelte';
    import { isBlocks } from '@components/project/Contexts';

    export let node: Conditional;

    const blocks = isBlocks();
</script>

{#if $blocks}
    <NodeView node={node.condition} /><NodeView node={node.question} />
    <NodeView node={node.yes} /><NodeView node={node.no} />
{:else}
    <span class="condition"
        ><NodeView node={node.condition} /><NodeView
            node={node.question}
        /></span
    ><NodeView node={node.yes} /><NodeView node={node.no} />
{/if}
