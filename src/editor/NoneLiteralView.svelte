<script lang="ts">
    import type NoneLiteral from "../nodes/NoneLiteral";
    import AliasesView from "./AliasesView.svelte";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: NoneLiteral;

</script>

<NodeView node={node}><TokenView node={node.none}/><AliasesView aliases={node.aliases}/></NodeView>