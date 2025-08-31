<script lang="ts">
    import type FunctionDefinition from '@nodes/FunctionDefinition';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: FunctionDefinition;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.docs} {format} /><NodeView
    node={node.share}
    {format}
/><NodeView node={node.fun} {format} /><NodeView
    node={node.names}
    {format}
/><NodeView node={node.types} {format} /><NodeView
    node={node.open}
    {format}
/><NodeSequenceView nodes={node.inputs} {format} /><NodeView
    node={node.close}
    {format}
/><NodeView node={node.dot} {format} /><NodeView
    node={node.output}
    {format}
/><NodeView node={node.expression} {format} />
