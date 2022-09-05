<script lang="ts">
    import type Column from "../nodes/Column";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Column;

</script>

<NodeView node={node}>
    <TokenView node={node.bar}/><OptionalNodeView node={node.bind}/>
</NodeView>