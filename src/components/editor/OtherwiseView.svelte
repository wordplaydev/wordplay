<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type Otherwise from '@nodes/Otherwise';

    interface Props {
        node: Otherwise;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.left} /><NodeView node={node.question} /><NodeView
    node={node.right}
/>
