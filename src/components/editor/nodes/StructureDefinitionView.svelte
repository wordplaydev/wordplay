<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type StructureDefinition from '@nodes/StructureDefinition';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: StructureDefinition;
        format: Format;
    }

    let { node, format }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <div class="definition">
        <NodeView node={node.docs} {format} />
        <div class="signature"
            ><NodeView node={node.share} {format} /><NodeView
                node={node.type}
                {format}
            /><NodeView node={node.names} {format} /><NodeSequenceView
                nodes={node.interfaces}
                {format}
            /><NodeView node={node.types} {format} /><NodeView
                node={node.open}
                {format}
            /><NodeSequenceView nodes={node.inputs} {format} /><NodeView
                node={node.close}
                {format}
            /></div
        ><NodeView node={node.expression} {format} />
    </div>
{:else}
    <NodeView node={node.docs} {format} /><NodeView
        node={node.share}
        {format}
    /><NodeView node={node.type} {format} /><NodeView
        node={node.names}
        {format}
    /><NodeSequenceView nodes={node.interfaces} {format} /><NodeView
        node={node.types}
        {format}
    /><NodeView node={node.open} {format} /><NodeSequenceView
        nodes={node.inputs}
        {format}
    /><NodeView node={node.close} {format} /><NodeView
        node={node.expression}
        {format}
    />
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
