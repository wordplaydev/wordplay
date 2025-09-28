<script lang="ts">
    import type Unit from '@nodes/Unit';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Unit;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeSequenceView {node} field="numerator" {format} empty="menu" /><NodeView
    node={[node, 'slash']}
    {format}
    empty="hide"
/><NodeSequenceView {node} field="denominator" {format} empty="hide" />
