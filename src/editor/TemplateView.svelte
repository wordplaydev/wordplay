<script lang="ts">
    import type Template from "../nodes/Template";
    import LanguageView from "./LanguageView.svelte";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let node: Template;

</script>

<NodeView node={node}>
    {#each node.parts as part }<OptionalNodeView node={part}/>{/each}<LanguageView node={node.format}/>
</NodeView>