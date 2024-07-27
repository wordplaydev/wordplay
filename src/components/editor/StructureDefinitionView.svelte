<svelte:options immutable={true} />

<script lang="ts">
    import type StructureDefinition from '@nodes/StructureDefinition';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';
    import { isBlocks } from '@components/project/Contexts';

    export let node: StructureDefinition;

    const blocks = isBlocks();
</script>

{#if $blocks}
    <div class="definition">
        <NodeView node={node.docs} />
        <div class="signature"
            ><NodeView node={node.share} /><NodeView
                node={node.type}
            /><NodeView node={node.names} /><NodeSequenceView
                nodes={node.interfaces}
            /><NodeView node={node.types} /><NodeView
                node={node.open}
            /><NodeSequenceView nodes={node.inputs} /><NodeView
                node={node.close}
            /></div
        ><NodeView node={node.expression} direction="column" />
    </div>
{:else}
    <NodeView node={node.docs} /><NodeView node={node.share} /><NodeView
        node={node.type}
    /><NodeView node={node.names} /><NodeSequenceView
        nodes={node.interfaces}
    /><NodeView node={node.types} /><NodeView
        node={node.open}
    /><NodeSequenceView nodes={node.inputs} /><NodeView
        node={node.close}
    /><NodeView node={node.expression} />
{/if}

<style>
    .definition {
        display: flex;
        flex-direction: column;
    }

    .definition :global(.space) {
        display: none;
    }

    .signature {
        display: flex;
        flex-direction: row;
    }
</style>
