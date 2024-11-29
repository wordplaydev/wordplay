<script lang="ts">
    import type UnionType from '@nodes/UnionType';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: UnionType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.left} /><NodeView node={node.or} /><NodeView
    node={node.right}
/>
