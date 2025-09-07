<script lang="ts">
    import type TableLiteral from '@nodes/TableLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: TableLiteral;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.type} /><NodeSequenceView nodes={node.rows} />
