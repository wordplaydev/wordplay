<script lang="ts">
    import type Evaluate from "../nodes/Evaluate";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";

    export let node: Evaluate;

</script>

<NodeView node={node.func}/><NodeSequenceView nodes={node.typeInputs} /><NodeView node={node.open}/><NodeSequenceView nodes={node.inputs}/><NodeView node={node.close}/>