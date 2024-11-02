<script lang="ts">
    import type Example from '@nodes/Example';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Example;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.open} /><NodeView node={node.program} /><NodeView
    node={node.close}
/>
