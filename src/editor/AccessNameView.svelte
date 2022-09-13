<script lang="ts">
    import type AccessName from "../nodes/AccessName";
    import NodeView from "./NodeView.svelte";

    export let node: AccessName;

</script>

<NodeView node={node.subject}/><NodeView node={node.access}/><NodeView node={node.name}/>