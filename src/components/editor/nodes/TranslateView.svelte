<script lang="ts">
    import type Translate from '@nodes/Translate';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Translate;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'expression']} {format} /><NodeView
    node={[node, 'translate']}
    {format}
/><NodeView node={[node, 'translation']} {format} />
