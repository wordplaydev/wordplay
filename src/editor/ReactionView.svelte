<script lang="ts">
    import type Reaction from "../nodes/Reaction";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Reaction;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.initial}/><TokenView node={node.delta}/><OptionalNodeView node={node.stream}/><OptionalNodeView node={node.next}/>
</NodeView>