<script lang="ts">
    import { getContext } from "svelte";
    import type Node from "../nodes/Node";
    import Program from "../nodes/Program";
    import Token from "../nodes/Token";
    import { CaretSymbol, DraggedSymbol, type HighlightContext, HighlightSymbol, LanguageSymbol, type CaretContext, type DraggedContext, type LanguageContext } from "./Contexts";
    import getNodeView from "./nodeToView";
    import createRowOutlineOf from "./outline";

    const HIGHLIGHT_PADDING = 20;

    export let node: Node | undefined;
    export let block: boolean = false;

    let caret = getContext<CaretContext>(CaretSymbol);
    let languages = getContext<LanguageContext>(LanguageSymbol);
    let highlights = getContext<HighlightContext>(HighlightSymbol);
    let dragged = getContext<DraggedContext>(DraggedSymbol);

    $: primaryConflicts = node === undefined ? [] : $caret?.source.getPrimaryConflictsInvolvingNode(node) ?? [];
    $: secondaryConflicts = node === undefined ? [] : $caret?.source.getSecondaryConflictsInvolvingNode(node) ?? [];
    $: isBeingDragged = $dragged === node;

    let element: HTMLElement | null = null;

    let mouseDown = false;

    $: highlightTypes = (node ? $highlights?.get(node) : undefined) ?? new Set();
    $: outline = node && element && (isBeingDragged || $highlights?.has(node)) ? createRowOutlineOf(element) : undefined;

</script>

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined}
    <div 
        class="{node.constructor.name} node-view {block ? "block" : "inline"} {primaryConflicts.length > 0 ? "primary-conflict" : ""} {secondaryConflicts.length > 0 ? "secondary-conflict" : ""} {highlightTypes.size > 0 ? "highlighted" : ""} { Array.from(highlightTypes).join(" ") } { $dragged === node ? "dragged" : ""}"
        data-id={node.id}
        bind:this={element}
        on:mousedown={() => mouseDown = true }
        on:mouseleave={() => mouseDown = false }
        on:mouseup={() => mouseDown = false }
        on:mousemove={event => {
            // Only start dragging once the mouse moves with the primary button down after being clicked.
            // The only nodes that can be dragged are those that are 1) in a program or 2) are root nodes not in a program.
            if(node) {
                const root = node?.getRoot();
                const draggable = !(node instanceof Token) && (root === node || root instanceof Program);
                if(draggable && event.buttons === 1 && mouseDown) { dragged.set(node); event.stopPropagation()} 
            }
        }}
    ><svelte:component this={getNodeView(node)} node={node} />{#if outline }<svg class={`highlight`} style={`top: ${outline.miny}; left: ${outline.minx}; `} width={outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2} height={outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2} viewBox={`${outline.minx} ${outline.miny} ${outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2} ${outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2}`}><path d={outline.path}/></svg>{/if}{#if primaryConflicts.length > 0}<div class="conflicts">{#each primaryConflicts as conflict}<div class="conflict">{conflict.getExplanation($languages[0])}</div>{/each}</div>{/if}</div>
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

    .primary-conflict {
        border-bottom: 2px solid var(--wordplay-error);
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

    /* Position selections relative to the node view */
    .highlight {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 0;
        /* Pure visual indicator. No events. Otherwise it interferes with node view events. */
        pointer-events: none;
    }
    
    /* The default path is styled below by different types of highlights */
    .highlight path {
        fill: none;
        stroke-width: var(--wordplay-border-width);
        stroke-linejoin: round;
    }

    .hovered .highlight path {
        fill: var(--wordplay-highlight);
        opacity: 0.2;
    }

    .selected .highlight path {
        stroke: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
    }

    .dragged .highlight path {
        fill: var(--wordplay-highlight);
        stroke: var(--wordplay-highlight);
    }
    /* When dragged, make text contrast visible */
    :global(.dragged .token-view) { color: var(--color-white) !important; }

    .executing .highlight path {
        fill: var(--wordplay-warning);
        stroke: var(--wordplay-warning);
    }
    /* When dragged, make text contrast visible */
    :global(.executing .token-view) { color: var(--color-white) !important; }

    .exception .highlight path {
        fill: var(--wordplay-error);
        stroke: var(--wordplay-error);
    }
    /* When dragged, make text contrast visible */
    :global(.exception .token-view) { color: var(--color-white) !important; }

    /* When beginning dragged in an editor, hide the node view contents to create a sense of spatial integrity. */
    :global(.editor .dragged .node-view) {
        opacity: 0;
    }

</style>