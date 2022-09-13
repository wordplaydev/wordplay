<script lang="ts">
    import type Language from "../nodes/Language";
    import NodeView from "./NodeView.svelte";
    
    export let node: Language;

</script>

<div><NodeView node={node.slash}/><NodeView node={node.lang}/></div>

<style>
    div {
        display: inline-block;
        font-style: italic;
    }
</style>