<script lang="ts">
    import type NumberLiteral from '@nodes/NumberLiteral';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: NumberLiteral;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.number} /><NodeView node={node.unit} small />
