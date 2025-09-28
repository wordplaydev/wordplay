<script lang="ts">
    import type Spread from '../../../nodes/Spread';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Spread;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'dots']} {format} /><NodeView
    node={[node, 'list']}
    {format}
/>
