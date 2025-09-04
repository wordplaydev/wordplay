<script lang="ts">
    import type Otherwise from '@nodes/Otherwise';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Otherwise;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.left} /><NodeView node={node.question} /><NodeView
    node={node.right}
/>
