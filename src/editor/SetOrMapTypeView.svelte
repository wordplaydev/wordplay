<script lang="ts">
    import type SetOrMapType from "../nodes/SetOrMapType";
    import NodeView from "./NodeView.svelte";
    import OptionalTokenView from "./OptionalTokenView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: SetOrMapType;

</script>

<div class="node-view">
    <TokenView node={node.open}/>
    <NodeView node={node.key}/>
    <OptionalTokenView node={node.bind}/>
    <NodeView node={node.value}/>
    <TokenView node={node.close}/>
</div>