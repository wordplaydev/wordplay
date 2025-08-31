<script lang="ts">
    import type BooleanType from '@nodes/BooleanType';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: BooleanType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.type} {format} />
