<script lang="ts">
    import type FunctionDefinition from "../nodes/FunctionDefinition";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";
    
    export let node: FunctionDefinition;

</script>

<NodeSequenceView nodes={node.docs}/><NodeView node={node.fun}/><NodeSequenceView nodes={node.aliases}/><NodeSequenceView nodes={node.typeVars}/><NodeView node={node.open}/><NodeSequenceView nodes={node.inputs}/><NodeView node={node.close}/><NodeView node={node.dot}/><NodeView node={node.type}/><NodeView node={node.expression}/>