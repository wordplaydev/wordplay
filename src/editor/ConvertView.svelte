<svelte:options immutable={true}/>
<script lang="ts">
    import type Convert from "../nodes/Convert";
    import NodeView from "./NodeView.svelte";

    export let node: Convert;

</script>

<NodeView node={node.expression}/><NodeView node={node.convert}/><NodeView node={node.type}/>