<script lang="ts">
    import type Delete from '@nodes/Delete';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Delete;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.table} /><NodeView node={node.del} /><NodeView
    node={node.query}
/>
