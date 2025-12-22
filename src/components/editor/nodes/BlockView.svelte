<script lang="ts">
    import type Block from '@nodes/Block';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Block;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'docs']} {format} empty="menu" /><NodeView
    node={[node, 'open']}
    {format}
    empty="hide"
/><NodeSequenceView
    {node}
    field="statements"
    {format}
    empty="label"
    block={node.isRoot()}
/><NodeView node={[node, 'close']} {format} empty="hide" />
