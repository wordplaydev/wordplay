<script lang="ts">
    import type Update from '@nodes/Update';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Update;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.table} /><NodeView node={node.row} /><NodeView
    node={node.query}
/>
