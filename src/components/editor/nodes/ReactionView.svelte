<script lang="ts">
    import type Reaction from '@nodes/Reaction';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Reaction;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'initial']} {format} /><NodeView
    node={[node, 'dots']}
    {format}
/><NodeView node={[node, 'condition']} {format} /><NodeView
    node={[node, 'nextdots']}
    {format}
/><NodeView node={[node, 'next']} {format} />
