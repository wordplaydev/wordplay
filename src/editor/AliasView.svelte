<script lang="ts">
    import type Alias from "../nodes/Alias";
    import LanguageView from "./LanguageView.svelte";
    import NodeView from "./NodeView.svelte";
    import OptionalTokenView from "./OptionalTokenView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: Alias;

</script>

<NodeView node={node}>
    <OptionalTokenView node={node.semicolon}/><TokenView node={node.name}/><LanguageView node={node.lang}/>
</NodeView>