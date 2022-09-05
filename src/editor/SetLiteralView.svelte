<script lang="ts">
    import type SetLiteral from "../nodes/SetLiteral";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: SetLiteral;

</script>

<NodeView node={node}>
    <TokenView node={node.open}/>{#each node.values as value }<OptionalNodeView node={value}/>{/each}<OptionalNodeView node={node.close}/>
</NodeView>