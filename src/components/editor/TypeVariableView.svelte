<script lang="ts">
    import type TypeVariable from '@nodes/TypeVariable';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: TypeVariable;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.names} />
