<script lang="ts">
    import type Template from "../nodes/Template";
    import LanguageView from "./LanguageView.svelte";
    import NodeView from "./NodeView.svelte";

    export let node: Template;

</script>

<div class="node-view">
    {#each node.parts as part }<NodeView node={part}/>{/each}<LanguageView node={node.format}/>
</div>