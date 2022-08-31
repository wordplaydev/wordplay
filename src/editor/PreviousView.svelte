<script lang="ts">
    import type Previous from "../nodes/Previous";
import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Previous;

</script>

<NodeView node={node}><OptionalNodeView node={node.stream}/><TokenView node={node.previous}/><OptionalNodeView node={node.index}/></NodeView>