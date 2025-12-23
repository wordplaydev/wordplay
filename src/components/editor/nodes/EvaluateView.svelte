<script lang="ts">
    import Evaluate from '@nodes/Evaluate';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Evaluate;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <NodeView node={[node, 'fun']} {format} />
    <NodeView node={[node, 'types']} {format} empty="hide" />
    <NodeView node={[node, 'open']} {format} />
    <NodeSequenceView
        {node}
        {format}
        field="inputs"
        empty="label"
        padding={false}
        block={node.inputs.reduce((sum, v) => sum + v.toWordplay().length, 0) >
            32}
    />
    <NodeView node={[node, 'close']} {format} />
{:else}
    <NodeView node={[node, 'fun']} {format} /><NodeView
        node={[node, 'types']}
        {format}
    /><NodeView node={[node, 'open']} {format} /><NodeSequenceView
        {node}
        {format}
        field="inputs"
        empty="label"
    /><NodeView node={[node, 'close']} {format} />
{/if}
