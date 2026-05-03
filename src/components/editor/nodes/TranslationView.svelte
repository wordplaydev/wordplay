<script lang="ts">
    import type Translation from '@nodes/Translation';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Translation;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'open']} {format} /><NodeSequenceView
    {node}
    field="segments"
    {format}
    empty="label"
/><NodeView node={[node, 'close']} {format} /><NodeView
    node={[node, 'language']}
    {format}
    empty="menu"
/><NodeView node={[node, 'separator']} {format} empty="hide" />
