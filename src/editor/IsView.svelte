<script lang="ts">
    import type Is from "../nodes/Is";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Is;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.left}/><TokenView node={node.operator}/><OptionalNodeView node={node.right}/>
</NodeView>