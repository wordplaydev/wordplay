<script lang="ts">
    import type UnionType from "../nodes/UnionType";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: UnionType;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.left}/><TokenView node={node.or}/><OptionalNodeView node={node.right}/>
</NodeView>