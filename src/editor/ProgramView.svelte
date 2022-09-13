<script lang="ts">
    import type Program from "../nodes/Program";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";

    export let node: Program;

</script>

<NodeSequenceView nodes={node.borrows}/><NodeView node={node.block}/><NodeView node={node.end}/>