<script lang="ts">
    import type TypePlaceholder from '@nodes/TypePlaceholder';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: TypePlaceholder;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'placeholder']} {format} />
