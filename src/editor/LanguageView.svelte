<svelte:options immutable={true}/>
<script lang="ts">
    import type Language from "../nodes/Language";
    import { getCaret } from "./Contexts";
    import NodeView from "./NodeView.svelte";
    
    export let node: Language;

    let caret = getCaret();
    $: parent = $caret?.source.get(node)?.getParent();
    $: inside = parent && $caret && $caret.isIn(parent)

</script>

{#if inside}<em><NodeView node={node.slash}/><NodeView node={node.lang}/></em>{/if}