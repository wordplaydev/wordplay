<script lang="ts">
    import type Language from "../nodes/Language";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: Language | undefined;

</script>

{#if node }<NodeView node={node}><small><em><TokenView node={node.slash}/><OptionalNodeView node={node.lang}/></em></small></NodeView>{/if}