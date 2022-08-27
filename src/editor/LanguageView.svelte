<script lang="ts">
    import type Language from "../nodes/Language";
    import TokenView from "./TokenView.svelte";
    
    export let node: Language;

</script>

<div class="node-view">
    <TokenView node={node.slash}/>
    <TokenView node={node.lang}/>
</div>