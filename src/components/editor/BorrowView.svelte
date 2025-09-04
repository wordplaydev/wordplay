<script lang="ts">
    import type Borrow from '@nodes/Borrow';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Borrow;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.borrow} /><NodeView node={node.source} /><NodeView
    node={node.dot}
/><NodeView node={node.name} /><NodeView node={node.version} />
