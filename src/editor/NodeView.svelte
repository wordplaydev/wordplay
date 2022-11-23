<svelte:options immutable={true}/>

<script lang="ts">
    import { afterUpdate } from "svelte";
    import type Node from "../nodes/Node";
    import { getLanguages, getHighlights, getCaret } from "./util/Contexts";
    import NodeHighlight from "./NodeHighlight.svelte";
    import getNodeView from "./util/nodeToView";
    import getOutlineOf, { getUnderlineOf, type Outline } from "./util/outline";

    export let node: Node | undefined;
    export let root: boolean = false;

    let caret = getCaret();
    let languages = getLanguages();
    let highlights = getHighlights();

    $: primaryConflicts = node === undefined ? [] : $caret?.source.getPrimaryConflictsInvolvingNode(node) ?? [];
    $: highlightTypes = (node ? $highlights?.get(node) : undefined) ?? new Set();

    let element: HTMLElement | null = null;
    let outline: Outline | undefined;
    let underline: Outline | undefined;

    // After each update, update the outlines if there's something to highlight.
    afterUpdate(() => {
        if(element && highlightTypes.size > 0) {
            outline = getOutlineOf(element);
            underline = getUnderlineOf(element);
        }
    });

</script>

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined}
    <div 
        class="{node.constructor.name} node-view {root ? "root" : ""} {highlightTypes.size > 0 ? "highlighted" : ""} { Array.from(highlightTypes).join(" ")}"
        data-id={node.id}
        bind:this={element}
    ><svelte:component this={getNodeView(node)} node={node} />{#if outline && underline }<NodeHighlight {outline} {underline}/>{/if}{#if primaryConflicts.length > 0}<div class="conflicts">{#each primaryConflicts as conflict}<div class="conflict">{conflict.getExplanation($languages[0])}</div>{/each}</div>{/if}</div>
{/if}

<style>

    .node-view {
        border-top-left-radius: var(--wordplay-editor-radius);
        border-bottom-right-radius: var(--wordplay-editor-radius);
        position: relative;
        display: inline;

        font-family: var(--wordplay-code-font-face);
        font-size: var(--wordplay-font-size);
        font-weight: 400;
    }

    .node-view.hovered {
        cursor: pointer;
    }

    .conflicts {
        position: absolute;
        top: 100%;
        left: 0;
        border: 2px solid var(--wordplay-black);
        font-size: x-small;
        font-weight: normal;
        background-color: var(--wordplay-error);
        color: var(--color-white);
        padding: var(--wordplay-spacing);
        z-index: 2;
        visibility: hidden;
    }

    .node-view:hover > .conflicts {
        visibility: visible;
    }

    .conflict {
        opacity: 1.0;
    }

    /* When beginning dragged in an editor, hide the node view contents to create a sense of spatial integrity. */
    .dragged :global(.token-view) {
        opacity: 0;
    }
    .dragged :global(.highlight) {
        opacity: .2;
    }

</style>