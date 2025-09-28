<script lang="ts">
    import type Row from '@nodes/Row';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';
    interface Props {
        node: Row;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'open']} {format} /><NodeSequenceView
    {node}
    field="cells"
    {format}
    empty="label"
/><NodeView node={[node, 'close']} {format} />
