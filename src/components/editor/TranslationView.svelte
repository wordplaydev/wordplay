<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type Translation from '../../nodes/Translation';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import { isBlocks } from '@components/project/Contexts';

    export let node: Translation;

    const blocks = isBlocks();
</script>

{#if $blocks}
    <NodeView node={node.open} /><NodeSequenceView
        nodes={node.segments}
    /><NodeView node={node.close} /><NodeView node={node.language} /><NodeView
        node={node.separator}
    />
{:else}
    <NodeView node={node.open} /><NodeSequenceView
        nodes={node.segments}
    /><NodeView node={node.close} /><NodeView node={node.language} /><NodeView
        node={node.separator}
    />
{/if}
