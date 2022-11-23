<svelte:options immutable={true}/>
<script lang="ts">
    import type AccessName from "../nodes/PropertyReference";
    import NodeView from "./NodeView.svelte";

    export let node: AccessName;

</script>

<NodeView node={node.structure}/><NodeView node={node.dot}/><NodeView node={node.name}/>