<svelte:options immutable={true}/>
<script lang="ts">
    import type Borrow from "../nodes/Borrow";
    import NodeView from "./NodeView.svelte";
    
    export let node: Borrow;

</script>

<NodeView node={node.borrow} /><NodeView node={node.name} /><NodeView node={node.version} />