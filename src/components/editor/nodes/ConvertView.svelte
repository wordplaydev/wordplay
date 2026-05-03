<script lang="ts">
    import type Convert from '@nodes/Convert';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Convert;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'expression']} {format} /><NodeView
    node={[node, 'convert']}
    {format}
/><NodeView node={[node, 'type']} {format} />
