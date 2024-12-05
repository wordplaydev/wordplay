<script lang="ts">
    import type Is from '@nodes/Is';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Is;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.expression} /><NodeView node={node.operator} /><NodeView
    node={node.type}
/>
