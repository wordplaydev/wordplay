<script lang="ts">
    import type Is from '@nodes/Is';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Is;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.expression} {format} /><NodeView
    node={node.operator}
    {format}
/><NodeView node={node.type} {format} />
