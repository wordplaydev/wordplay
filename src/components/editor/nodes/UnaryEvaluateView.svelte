<script lang="ts">
    import type UnaryEvaluate from '@nodes/UnaryEvaluate';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: UnaryEvaluate;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'fun']} {format} /><NodeView
    node={[node, 'input']}
    {format}
/>
