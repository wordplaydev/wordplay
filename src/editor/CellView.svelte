<script lang="ts">
    import type Cell from "../nodes/Cell";
import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Cell;

</script>

<NodeView node={node}>
    <TokenView node={node.bar}/><OptionalNodeView node={node.expression}/>
</NodeView>