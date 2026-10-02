<script lang="ts">
    import type Is from '#nodes/Is.ts';
    import NodeView, {
        type Format,
    } from '#components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Is;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'expression']} {format} /><NodeView
    node={[node, 'operator']}
    {format}
/><NodeView node={[node, 'type']} {format} />
