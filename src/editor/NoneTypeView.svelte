<script lang="ts">
    import type NoneType from "../nodes/NoneType";
    import AliasesView from "./AliasesView.svelte";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: NoneType;

</script>

<NodeView node={node}><TokenView node={node.none}/><AliasesView aliases={node.aliases}/></NodeView>