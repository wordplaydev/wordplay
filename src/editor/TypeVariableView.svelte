<script lang="ts">
    import type TypeVariable from "../nodes/TypeVariable";
    import TokenView from "./TokenView.svelte";

    export let node: TypeVariable;

</script>

<div class="node-view">
    <TokenView node={node.type}/><TokenView node={node.name}/>
</div>