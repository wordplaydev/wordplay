<script lang="ts">
    import type FunctionType from '@nodes/FunctionType';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: FunctionType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.fun} {format} /><NodeView
    node={node.types}
    {format}
/><NodeView node={node.open} {format} /><NodeSequenceView
    nodes={node.inputs}
    {format}
/><NodeView node={node.close} {format} /><NodeView
    node={node.output}
    {format}
/>
