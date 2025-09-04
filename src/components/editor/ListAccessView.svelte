<script lang="ts">
    import type ListAccess from '@nodes/ListAccess';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: ListAccess;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.list} /><NodeView node={node.open} /><NodeView
    node={node.index}
/><NodeView node={node.close} />
