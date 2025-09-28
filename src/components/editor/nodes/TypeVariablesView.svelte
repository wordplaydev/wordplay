<script lang="ts">
    import type TypeVariables from '@nodes/TypeVariables';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: TypeVariables;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.open} {format} /><NodeSequenceView
    {node}
    field="variables"
    {format}
    empty="menu"
/><NodeView node={node.close} {format} />
