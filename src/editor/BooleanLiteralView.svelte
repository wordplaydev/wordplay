<script lang="ts">
    import type BooleanLiteral from "../nodes/BooleanLiteral";
    import TokenView from "./TokenView.svelte";

    export let node: BooleanLiteral;

</script>

<div class="node-view">
    <TokenView node={node.value}/>
</div>