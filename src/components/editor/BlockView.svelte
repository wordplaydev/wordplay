<svelte:options immutable={true} />

<script lang="ts">
    import type Block from '@nodes/Block';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';
    import { isBlocks } from '@components/project/Contexts';

    export let node: Block;

    const blocks = isBlocks();
</script>

{#if $blocks}
    <NodeView node={node.docs} /><NodeView node={node.open} /><div
        class="indent"
        ><NodeSequenceView
            nodes={node.statements}
            direction={node.statements.length > 1 ? 'column' : 'row'}
        /></div
    ><NodeView node={node.close} />
{:else}
    <NodeView node={node.docs} /><NodeView node={node.open} /><NodeSequenceView
        nodes={node.statements}
    /><NodeView node={node.close} />
{/if}

<style>
    .indent {
        margin-left: var(--wordplay-spacing);
    }
</style>
