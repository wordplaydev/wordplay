<script lang="ts">
    import type TypePlaceholder from '@nodes/TypePlaceholder';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: TypePlaceholder;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.placeholder} />
