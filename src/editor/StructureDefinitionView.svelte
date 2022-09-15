<script lang="ts">
    import type StructureDefinition from "../nodes/StructureDefinition";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";
    
    export let node: StructureDefinition;

</script>

<NodeSequenceView nodes={node.docs}/><span class="definition"><span class="signature"><NodeView node={node.type}/><NodeSequenceView nodes={node.aliases}/><NodeSequenceView nodes={node.interfaces}/><NodeSequenceView nodes={node.typeVars}/><NodeView node={node.open}/><NodeSequenceView nodes={node.inputs}/><NodeView node={node.close}/></span><NodeView node={node.block}/></span>