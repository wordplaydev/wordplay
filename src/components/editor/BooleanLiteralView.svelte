<script lang="ts">
    import type BooleanLiteral from '@nodes/BooleanLiteral';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: BooleanLiteral;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.value} />
