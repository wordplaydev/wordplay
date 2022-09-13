<script lang="ts">
    import type ConversionDefinition from "../nodes/ConversionDefinition";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";
    
    export let node: ConversionDefinition;

</script>

<NodeSequenceView nodes={node.docs}/><NodeView node={node.convert}/><NodeView node={node.output}/><NodeView node={node.expression}/>