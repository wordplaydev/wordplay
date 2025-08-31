<script lang="ts">
    import type SetType from '@nodes/SetType';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: SetType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.open} {format} /><NodeView
    node={node.key}
    {format}
/><NodeView node={node.close} {format} />
