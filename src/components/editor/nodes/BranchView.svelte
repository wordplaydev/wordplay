<script lang="ts">
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import type Branch from '@nodes/Branch';

    interface Props {
        node: Branch;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<!-- The arms and the `|` bars between them are one interleaved list on the node,
     so they render as one sequence rather than as arms with separators drawn in. -->
<NodeView node={[node, 'mention']} {format} /><NodeView
    node={[node, 'open']}
    {format}
/><NodeSequenceView
    {node}
    field="segments"
    {format}
    empty="menu"
    wrap
/><NodeView node={[node, 'close']} {format} empty="hide" />
