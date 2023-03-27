<svelte:options immutable={true} />

<script lang="ts">
    import type MeasurementLiteral from '@nodes/MeasurementLiteral';
    import NodeView from './NodeView.svelte';

    export let node: MeasurementLiteral;
</script>

<NodeView node={node.number} /><NodeView node={node.unit} small />
