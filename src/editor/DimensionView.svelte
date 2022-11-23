<svelte:options immutable={true}/>
<script lang="ts">
    import type Dimension from "../nodes/Dimension";
    import NodeView from "./NodeView.svelte";

    export let node: Dimension;

</script>

<NodeView node={node.name}/><NodeView node={node.caret}/><NodeView node={node.exponent}/>