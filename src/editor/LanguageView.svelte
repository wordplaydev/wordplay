<script lang="ts">
    import type Language from "../nodes/Language";
    import TokenView from "./TokenView.svelte";
    
    export let node: Language | undefined;

</script>

{#if node }<small><TokenView node={node.slash}/><TokenView node={node.lang}/></small>{/if}