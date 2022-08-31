<script lang="ts">
    import type ListLiteral from "../nodes/ListLiteral";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: ListLiteral;

</script>

<div class="node-view">
    <TokenView node={node.open}/>{#each node.values as value }<NodeView node={value}/>{/each}<TokenView node={node.close}/>
</div>