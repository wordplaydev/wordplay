<script lang="ts">
    import type NumberLiteral from '@nodes/NumberLiteral';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: NumberLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.number} {format} /><NodeView node={node.unit} {format} />
