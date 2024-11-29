<script lang="ts">
    import type StreamType from '@nodes/StreamType';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: StreamType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.stream} /><NodeView node={node.type} />
