<script lang="ts">
    import type Language from "../nodes/Language";
    import TokenView from "./TokenView.svelte";
    
    export let node: Language | undefined;

</script>

<div class="node-view">{#if node }<TokenView node={node.slash}/><TokenView node={node.lang}/>{/if}</div>