<svelte:options immutable={true}/>
<script lang="ts">
    import type ConversionDefinition from "../nodes/ConversionDefinition";
    import NodeView from "./NodeView.svelte";
    
    export let node: ConversionDefinition;

</script>

<NodeView node={node.docs}/><NodeView node={node.input}/><NodeView node={node.arrow}/><NodeView node={node.output}/><NodeView node={node.expression}/>