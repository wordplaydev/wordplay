<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type ConversionType from '../../nodes/ConversionType';

    export let node: ConversionType;
</script>

<NodeView node={node.input} /><NodeView node={node.convert} /><NodeView
    node={node.output}
/>
