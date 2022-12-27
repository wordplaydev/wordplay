<svelte:options immutable={true}/>
<script lang="ts">
    import { getCaret, getRoot } from "./util/Contexts";
    import { languages } from "../models/languages";
    import type Node from "../nodes/Node";
    import type Doc from "../nodes/Doc";
    import type Name from "../nodes/Name";
    import NodeView from "./NodeView.svelte";
    import type LanguageCode from "../nodes/LanguageCode";
    import { project } from "../models/stores";
    import Program from "../nodes/Program";

    export let node: Node;
    export let list: (Doc|Name)[];

    let root = getRoot();
    let caret = getCaret();
    $: show = !($root?.node instanceof Program) || ($project.evaluator.isPlaying() && $caret?.isIn(node));
    $: visible = list.filter(item => $languages.includes((item.lang?.getLanguage() ?? "") as LanguageCode));

</script>

<!-- If the caret is in the docs, show all of them for navigation and editing purposes. Otherwise, just show the selected languages -->
{#each list as item, index }{@const lang = item.lang?.getLanguageCode() }<span class={`language-tagged ${(visible.length === 0 && index === 0) || (lang && $languages.includes(lang)) ? "visible" : show ? "inside" : "hidden"} ${(visible.length > 0 && visible[0] === item) || (visible.length === 0 && index === 0) ? "first-visible" : ""} ${index === 0 ? "first" : ""}`}><NodeView node={item} /></span>{/each}

<style>
    .language-tagged :global(.text) {
        display: inline-block;
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

    .hidden :global(.break) {
        display: none;
    }

    .first-visible.visible :global(.comma) {
        display: none;
    }

</style>