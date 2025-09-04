<script lang="ts">
    import type Row from '@nodes/Row';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';
    interface Props {
        node: Row;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.open} /><NodeSequenceView nodes={node.cells} /><NodeView
    node={node.close}
/>
