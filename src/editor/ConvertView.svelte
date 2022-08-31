<script lang="ts">
    import type Convert from "../nodes/Convert";
import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Convert;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.expression}/><TokenView node={node.convert}/><OptionalNodeView node={node.type}/>
</NodeView>