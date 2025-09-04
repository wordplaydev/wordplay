<script lang="ts">
    import type Select from '@nodes/Select';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Select;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.table} /><NodeView node={node.row} /><NodeView
    node={node.query}
/>
