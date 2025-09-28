<script lang="ts">
    import type Translation from '../../../nodes/Translation';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Translation;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.open} {format} /><NodeSequenceView
    {node}
    field="segments"
    {format}
/><NodeView node={node.close} {format} /><NodeView
    node={node.language}
    {format}
/><NodeView node={node.separator} {format} />
