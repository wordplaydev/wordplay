<script lang="ts">
    // import { getContext } from "svelte";
    // import type { Writable } from "svelte/store";
    import type Alias from "../nodes/Alias";
    // import type LanguageCode from "../nodes/LanguageCode";
    import NodeView from "./NodeView.svelte";
    
    export let node: Alias;

    // let languages = getContext<Writable<LanguageCode[]>>("languages");

    // $: caretIn = false;
    // $: lang = node.getLanguage();
    // $: languageSelected = lang === undefined || $languages.includes(lang as LanguageCode)

</script>

<!-- {#if languageSelected}
    <NodeView node={node.name}/>
{:else if caretIn } -->
    <NodeView node={node.separator}/><strong><NodeView node={node.name}/></strong><NodeView node={node.lang}/>
<!-- {/if} -->