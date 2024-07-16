<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type Translation from '../../nodes/Translation';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import { blocks } from '@db/Database';

    export let node: Translation;
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
