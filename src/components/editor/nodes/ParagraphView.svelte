<script lang="ts">
    import type Paragraph from '@nodes/Paragraph';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import { type Format } from './NodeView.svelte';

    interface Props {
        node: Paragraph;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeSequenceView
    {node}
    field="segments"
    filtered={node.getNodeSegments()}
    {format}
/>
