<script lang="ts">
    import type TypeVariables from '#nodes/TypeVariables.ts';
    import NodeSequenceView from '#components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '#components/editor/nodes/NodeView.svelte';

    interface Props {
        node: TypeVariables;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'open']} {format} /><NodeSequenceView
    {node}
    field="variables"
    {format}
    empty="menu"
/><NodeView node={[node, 'close']} {format} />
