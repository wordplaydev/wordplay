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

<NodeSequenceView nodes={node.numerator} {format} /><NodeView
    node={node.slash}
    {format}
/><NodeSequenceView nodes={node.denominator} {format} />
