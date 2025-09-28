<script lang="ts">
    import type Initial from '../../../nodes/Initial';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Initial;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'diamond']} {format} />
