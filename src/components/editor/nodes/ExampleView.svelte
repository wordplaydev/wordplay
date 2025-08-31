<script lang="ts">
    import type Example from '@nodes/Example';
    import NodeView, { type Format } from './NodeView.svelte';

    interface ExampleProps {
        node: Example;
        format: Format;
    }

    let { node, format }: ExampleProps = $props();
</script>

<NodeView node={node.open} {format} /><NodeView
    node={node.program}
    {format}
/><NodeView node={node.close} {format} />
