<svelte:options immutable={true}/>
<script lang="ts">
    import Token, { SPACE_HTML, tabToHTML, TAB_WIDTH } from "../nodes/Token";
    import { getInsertionPoints } from "./Contexts";
    import InsertionPointView from "./InsertionPointView.svelte";

    export let token: Token;
    export let space: string;
    export let additional: string;

    let insertionPoints = getInsertionPoints();

    // Is there an insertion point before this token? Show one!
    $: insertion = $insertionPoints?.get(token);
    $: insertionIndex = insertion !== undefined ? space.split("\n", insertion.line).join("\n").length + 1 : undefined;
    $: spaceBeforeHTML = (insertionIndex === undefined ? "" : space.substring(0, insertionIndex)).replaceAll(" ", SPACE_HTML).replaceAll("\t", tabToHTML()).replaceAll("\n", "<span class='break'><br/></span>");
    $: spaceAfterHTML = 
        (insertionIndex === undefined ? space : space.substring(insertionIndex)).replaceAll(" ", SPACE_HTML).replaceAll("\t", tabToHTML()).replaceAll("\n", "<span class='break'><br/></span>") +
        additional.replaceAll(" ", "&nbsp;").replaceAll("\t", "&nbsp;".repeat(TAB_WIDTH)).replaceAll("\n", "<span class='break'><br/></span>");

</script>

{#if insertion}<span class="space">{@html spaceBeforeHTML}</span><InsertionPointView/>{/if}<span class="space">{@html spaceAfterHTML }</span>

<style>
    /* Make space visible, but just so. */
    .space {
        color: var(--wordplay-disabled-color);
    }
</style>