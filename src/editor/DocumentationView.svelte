<script lang="ts">
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import type Docs from "../nodes/Documentation";
    import type LanguageCode from "../nodes/LanguageCode";
    import NodeView from "./NodeView.svelte";
    
    export let node: Docs;

    let languages = getContext<Writable<LanguageCode[]>>("languages");

    $: caretIn = false;
    $: lang = node.getLanguage();
    $: languageSelected = lang === undefined || $languages.includes(lang as LanguageCode)

</script>

<!-- {#if languageSelected}
    <NodeView node={node.docs}/>
{:else if caretIn } -->
    <NodeView node={node.docs}/><NodeView node={node.lang}/>
<!-- {/if} -->
