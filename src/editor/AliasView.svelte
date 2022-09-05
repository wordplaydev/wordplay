<script lang="ts">
    import type Alias from "../nodes/Alias";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import OptionalTokenView from "./OptionalTokenView.svelte";
    
    export let node: Alias;

</script>

<NodeView node={node}>
    <OptionalTokenView node={node.semicolon}/><OptionalTokenView node={node.name}/><OptionalNodeView node={node.lang}/>
</NodeView>