<script lang="ts">
    import type Dimension from '@nodes/Dimension';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Dimension;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.product} /><NodeView node={node.name} /><NodeView
    node={node.caret}
/><NodeView node={node.exponent} />
