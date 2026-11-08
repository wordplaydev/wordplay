<script lang="ts">
    import type Unit from '#nodes/Unit.ts';
    import NodeSequenceView from '#components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '#components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Unit;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<!-- The slash is addable in blocks mode once there is a unit to divide, which is
     what makes the denominator's menu appear. Offered on a bare number too, it was a
     second ▾ beside the unit's own, with nothing to say what either was for (#1484). -->
<NodeSequenceView {node} field="numerator" {format} empty="menu" /><NodeView
    node={[node, 'slash']}
    {format}
    empty={format.block && node.numerator.length > 0 ? 'menu' : 'hide'}
/><NodeSequenceView
    {node}
    field="denominator"
    {format}
    empty={node.slash ? 'menu' : 'hide'}
/>
