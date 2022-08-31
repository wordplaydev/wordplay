<script lang="ts">
    import type AccessName from "../nodes/AccessName";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: AccessName;

</script>

<div class="node-view">
    <NodeView node={node.subject}/><TokenView node={node.access}/><TokenView node={node.name}/>
</div>