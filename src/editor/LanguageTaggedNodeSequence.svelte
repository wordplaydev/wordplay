<script lang="ts">
    import { getCaret, getLanguages } from "./Contexts";
    import type Node from "../nodes/Node";
    import type Doc from "../nodes/Doc";
    import type Name from "../nodes/Name";
    import NodeView from "./NodeView.svelte";
    import type LanguageCode from "../nodes/LanguageCode";

    export let node: Node;
    export let list: (Doc|Name)[];

    let caret = getCaret();
    let languages = getLanguages();
    $: inside = $caret?.isIn(node);
    $: empty = !list.some(item => $languages.includes((item.lang?.getLanguage() ?? "") as LanguageCode));

</script>

<!-- If the caret is in the docs, show all of them for navigation and editing purposes. Otherwise, just show the selected languages -->
{#each list as item, index }{@const lang = item.lang?.getLanguageCode() }<span class={`language-tagged ${(empty && index === 0) || (lang && $languages.includes(lang)) ? "" : inside ? "inside" : "hidden"} ${index === 0 ? "first" : ""}`}><NodeView node={item} /></span>{/each}

<style>
    .language-tagged :global(.text) {
        display: inline-block;
        transition: transform 0.25s, max-width 0.25s, max-height 0.25s;
        transform: scale(1, 1);
        max-width: 100em;
    }

    .hidden :global(.text) {
        transform: scale(0, 0);
        max-width: 0em;
        max-height: 0em;
        height: 0em;
    }

    .hidden:not(.first) :global(.break) {
        display: none;
    }

</style>