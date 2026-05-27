<script lang="ts">
    import type Markup from '@nodes/Markup';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Markup;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeSequenceView
    {node}
    field="paragraphs"
    {format}
    empty="label"
    add={false}
    wrap
    breaks
    direction="block"
/>
