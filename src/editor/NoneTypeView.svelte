<script lang="ts">
    import type NoneType from "../nodes/NoneType";
    import AliasesView from "./AliasesView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: NoneType;

</script>

<div class="node-view">
    <TokenView node={node.none}/>
    <AliasesView aliases={node.aliases}/>
</div>