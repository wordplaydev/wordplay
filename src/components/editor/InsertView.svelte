<script lang="ts">
    import type Insert from '@nodes/Insert';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Insert;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.table} /><NodeView node={node.row} />
