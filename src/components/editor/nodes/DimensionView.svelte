<script lang="ts">
    import type Dimension from '@nodes/Dimension';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Dimension;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.product} {format} /><NodeView
    node={node.name}
    {format}
/><NodeView node={node.caret} {format} /><NodeView
    node={node.exponent}
    {format}
/>
