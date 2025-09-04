<script lang="ts">
    import type Convert from '@nodes/Convert';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Convert;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.expression} /><NodeView node={node.convert} /><NodeView
    node={node.type}
/>
