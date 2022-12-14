<svelte:options immutable={true}/>
<script lang="ts">
    import type TypeInputs from "../nodes/TypeInputs";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";

    export let node: TypeInputs;

</script>

<NodeView node={node.open}/><NodeSequenceView nodes={node.types}/><NodeView node={node.close}/>