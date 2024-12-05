<script lang="ts">
    import type NoneLiteral from '@nodes/NoneLiteral';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: NoneLiteral;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.none} />
