<script lang="ts">
    import type BinaryEvaluate from '@nodes/BinaryEvaluate';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: BinaryEvaluate;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'left']} {format} /><NodeView
    node={[node, 'fun']}
    {format}
/><NodeView node={[node, 'right']} {format} />
