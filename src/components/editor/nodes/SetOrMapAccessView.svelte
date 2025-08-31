<script lang="ts">
    import type SetOrMapAccess from '@nodes/SetOrMapAccess';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: SetOrMapAccess;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.setOrMap} {format} /><NodeView
    node={node.open}
    {format}
/><NodeView node={node.key} {format} /><NodeView node={node.close} {format} />
