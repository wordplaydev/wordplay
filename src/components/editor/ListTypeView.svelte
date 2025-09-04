<script lang="ts">
    import type ListType from '@nodes/ListType';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: ListType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.open} /><NodeView node={node.type} /><NodeView
    node={node.close}
/>
