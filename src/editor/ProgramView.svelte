<svelte:options immutable={true}/>
<script lang="ts">
    import type Program from "../nodes/Program";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";

    export let node: Program;

</script>

<NodeView node={node.docs}/><NodeSequenceView nodes={node.borrows}/><NodeView node={node.expression}/><NodeView node={node.end}/>