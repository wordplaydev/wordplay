<svelte:options immutable={true} />

<script lang="ts">
    import type NumberLiteral from '@nodes/NumberLiteral';
    import NodeView from './NodeView.svelte';

    export let node: NumberLiteral;
</script>

<NodeView node={node.number} /><NodeView node={node.unit} small />
