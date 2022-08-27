<script lang="ts">
    import type Borrow from "../nodes/Borrow";
    import OptionalToken from "./OptionalTokenView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: Borrow;

</script>

<div class="node-view">
    <TokenView node={node.borrow} />
    <TokenView node={node.name} />
    <OptionalToken node={node.version} />
</div>