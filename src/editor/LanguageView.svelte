<script lang="ts">
    import type Language from "../nodes/Language";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: Language | undefined;

</script>

{#if node }<NodeView node={node}><small><TokenView node={node.slash}/><TokenView node={node.lang}/></small></NodeView>{/if}