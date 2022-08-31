<script lang="ts">
    import type NoneLiteral from "../nodes/NoneLiteral";
    import AliasesView from "./AliasesView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: NoneLiteral;

</script>

<div class="node-view">
    <TokenView node={node.none}/><AliasesView aliases={node.aliases}/>
</div>