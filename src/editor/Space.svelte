<svelte:options immutable={true}/>
<script lang="ts">
    import type Token from "../nodes/Token";
    import { getInsertionPoints } from "./util/Contexts";
    import InsertionPointView from "./InsertionPointView.svelte";
    import { SPACE_HTML, TAB_WIDTH, tabToHTML } from "../parser/Spaces";

    export let token: Token;
    export let space: string;
    export let additional: string;

    let insertionPoints = getInsertionPoints();

    // Is there an insertion point before this token? Show one!
    $: insertion = $insertionPoints?.get(token);
    $: insertionIndex = insertion !== undefined ? space.split("\n", insertion.line).join("\n").length + 1 : undefined;
    // If there's an insertion, figure out what space to render before the insertion.
    $: spaceBeforeHTML = (insertionIndex === undefined ? "" : space.substring(0, insertionIndex)).replaceAll(" ", SPACE_HTML).replaceAll("\t", tabToHTML()).replaceAll("\n", "<span class='break'><br/></span>");
    // If there's no insertion, just render the space, otherwise render the right side of the insertion.
    $: spaceAfterHTML = 
        (insertionIndex === undefined ? space : space.substring(insertionIndex))
            .replaceAll(" ", SPACE_HTML).replaceAll("\t", tabToHTML()).replaceAll("\n", "<span class='break'><br/></span>") +
        additional.replaceAll(" ", "&nbsp;").replaceAll("\t", "&nbsp;".repeat(TAB_WIDTH)).replaceAll("\n", "<span class='break'><br/></span>");

</script>

{#if insertion}<span class="space" data-id={token.id}>{@html spaceBeforeHTML}</span><InsertionPointView/>{/if}<span class="space" data-id={token.id}>{@html spaceAfterHTML }</span>

<style>
    /* Make space visible, but just so. */
    .space {
        color: var(--wordplay-disabled-color);
    }

    /* If the space is in something dragged, hide it */
    :global(.dragged) .space {
        visibility: hidden;
    }
</style>