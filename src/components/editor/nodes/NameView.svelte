<script lang="ts">
    import type Alias from '@nodes/Name';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Alias;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<strong><NodeView node={node.name} {format} /></strong><NodeView
    node={node.language}
    {format}
/><NodeView node={node.separator} {format} />
