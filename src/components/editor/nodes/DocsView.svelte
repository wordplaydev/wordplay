<script lang="ts">
    import type Docs from '@nodes/Docs';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import type { Format } from './NodeView.svelte';

    interface DocsProps {
        node: Docs;
        format: Format;
    }

    let { node, format }: DocsProps = $props();
</script>

<NodeSequenceView
    {node}
    field="docs"
    empty="menu"
    {format}
    direction="block"
    padding={false}
/>
