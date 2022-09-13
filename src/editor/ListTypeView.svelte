<script lang="ts">
    import type ListType from "../nodes/ListType";
    import NodeView from "./NodeView.svelte";

    export let node: ListType;

</script>

<NodeView node={node.open}/><NodeView node={node.type}/><NodeView node={node.close}/>