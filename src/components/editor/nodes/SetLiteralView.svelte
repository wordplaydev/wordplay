<script lang="ts">
    import type SetLiteral from '@nodes/SetLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: SetLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <NodeView node={node.open} {format} />
    <NodeSequenceView
        nodes={node.values}
        {format}
        elide
        block={node.values.map((v) => v.toWordplay()).join().length > 40}
    />
    <NodeView node={node.close} {format} />
    <NodeView node={node.literal} {format} />
{:else}
    <NodeView node={node.open} {format} /><NodeSequenceView
        nodes={node.values}
        {format}
        elide
    /><NodeView node={node.close} {format} /><NodeView
        node={node.literal}
        {format}
    />
{/if}
