<script lang="ts">
    import type Changed from '@nodes/Changed';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Changed;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.change} /><NodeView node={node.stream} />
