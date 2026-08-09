<script lang="ts">
    import type Unit from '@nodes/Unit';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Unit;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<!-- The slash is addable in blocks mode, which is what makes the denominator's menu appear. -->
<NodeSequenceView {node} field="numerator" {format} empty="menu" /><NodeView
    node={[node, 'slash']}
    {format}
    empty={format.block ? 'menu' : 'hide'}
/><NodeSequenceView
    {node}
    field="denominator"
    {format}
    empty={node.slash ? 'menu' : 'hide'}
/>
