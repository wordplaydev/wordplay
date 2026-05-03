<script lang="ts">
    import type BooleanLiteral from '@nodes/BooleanLiteral';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: BooleanLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'value']} {format} />
