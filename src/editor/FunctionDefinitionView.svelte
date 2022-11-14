<script lang="ts">
    import type FunctionDefinition from "../nodes/FunctionDefinition";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";
    
    export let node: FunctionDefinition;

</script>

<NodeView node={node.docs}/><NodeView node={node.fun}/><NodeView node={node.names}/><NodeSequenceView nodes={node.typeVars}/><NodeView node={node.open}/><NodeSequenceView nodes={node.inputs}/><NodeView node={node.close}/><NodeView node={node.dot}/><NodeView node={node.output}/><NodeView node={node.expression}/>