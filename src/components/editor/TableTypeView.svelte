<script lang="ts">
    import type TableType from '@nodes/TableType';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: TableType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.open} /><NodeSequenceView nodes={node.columns} /><NodeView
    node={node.close}
/>
