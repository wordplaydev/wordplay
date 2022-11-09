<script lang="ts">
    import { afterUpdate, getContext } from "svelte";
    import type Node from "../nodes/Node";
    import Program from "../nodes/Program";
    import Token from "../nodes/Token";
    import { CaretSymbol, DraggedSymbol, type HighlightContext, HighlightSymbol, LanguageSymbol, type CaretContext, type DraggedContext, type LanguageContext } from "./Contexts";
    import type { HighlightType } from "./Highlights";
    import NodeHighlight from "./NodeHighlight.svelte";
    import getNodeView from "./nodeToView";
    import getOutlineOf, { getUnderlineOf, type Outline } from "./outline";

    export let node: Node | undefined;
    export let block: boolean = false;

    let caret = getContext<CaretContext>(CaretSymbol);
    let languages = getContext<LanguageContext>(LanguageSymbol);
    let highlights = getContext<HighlightContext>(HighlightSymbol);
    let dragged = getContext<DraggedContext>(DraggedSymbol);

    $: primaryConflicts = node === undefined ? [] : $caret?.source.getPrimaryConflictsInvolvingNode(node) ?? [];
    $: highlightTypes = (node ? $highlights?.get(node) : undefined) ?? new Set<HighlightType>($dragged === node ? [ "dragged"] : []);

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

    let mouseDown = false;


</script>

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined}
    <div 
        class="{node.constructor.name} node-view {block ? "block" : "inline"} {highlightTypes.size > 0 ? "highlighted" : ""} { Array.from(highlightTypes).join(" ")}"
        data-id={node.id}
        bind:this={element}
        on:mousedown={() => mouseDown = true }
        on:mouseleave={() => mouseDown = false }
        on:mouseup={() => mouseDown = false }
        on:mousemove={event => {
            // Only start dragging once the mouse moves with the primary button down after being clicked.
            // The only nodes that can be dragged are those that are 1) in a program or 2) are root nodes not in a program.
            if(node && $dragged === undefined) {
                const root = node?.getRoot();
                const draggable = !(node instanceof Token) && (root === node || root instanceof Program);
                if(draggable && event.buttons === 1 && mouseDown) { 
                    dragged.set(node); 
                    event.stopPropagation();
                } 
            }
        }}
    ><svelte:component this={getNodeView(node)} node={node} />{#if outline && underline }<NodeHighlight {outline} {underline}/>{/if}{#if primaryConflicts.length > 0}<div class="conflicts">{#each primaryConflicts as conflict}<div class="conflict">{conflict.getExplanation($languages[0])}</div>{/each}</div>{/if}</div>
{/if}

<style>

    .node-view {
        border-top-left-radius: var(--wordplay-editor-radius);
        border-bottom-right-radius: var(--wordplay-editor-radius);
        position: relative;

        font-family: var(--wordplay-code-font-face);
        font-size: var(--wordplay-font-size);
        font-weight: 400;
    }

    .node-view.inline {
        display: inline;
    }

    .node-view.block {
        display: inline-block;
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
    :global(.editor .dragged .node-view) {
        opacity: 0;
    }

</style>