<script lang="ts">
    import type SetOrMapLiteral from "../nodes/SetOrMapLiteral";
    import NodeView from "./NodeView.svelte";
import OptionalTokenView from "./OptionalTokenView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: SetOrMapLiteral;

</script>

<div class="node-view">
    <TokenView node={node.open}/>
    <OptionalTokenView node={node.bind}/>
    {#each node.values as value}<NodeView node={value}/>{/each}
    <TokenView node={node.close}/>
</div>