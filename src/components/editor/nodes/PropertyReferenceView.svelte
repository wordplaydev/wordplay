<script lang="ts">
    import type PropertyReference from '@nodes/PropertyReference';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: PropertyReference;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'structure']} {format} /><NodeView
    node={[node, 'dot']}
    {format}
/><NodeView node={[node, 'name']} {format} />
