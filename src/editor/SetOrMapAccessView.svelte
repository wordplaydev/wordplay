<script lang="ts">
    import type SetOrMapAccess from "../nodes/SetOrMapAccess";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: SetOrMapAccess;

</script>

<div class="node-view">
    <NodeView node={node.setOrMap}/>
    <TokenView node={node.open}/>
    <NodeView node={node.key}/>
    <TokenView node={node.close}/>
</div>