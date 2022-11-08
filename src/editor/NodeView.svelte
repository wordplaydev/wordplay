<script lang="ts">
    import { getContext } from "svelte";
    import type Node from "../nodes/Node";
    import Program from "../nodes/Program";
    import Token from "../nodes/Token";
    import { CaretSymbol, DraggedSymbol, type HighlightContext, HighlightSymbol, HoveredSymbol, LanguageSymbol, type CaretContext, type DraggedContext, type HoveredContext, type LanguageContext } from "./Contexts";
    import getNodeView from "./nodeToView";
    import createRowOutlineOf from "./outline";

    export let node: Node | undefined;
    export let block: boolean = false;

    let caret = getContext<CaretContext>(CaretSymbol);
    let languages = getContext<LanguageContext>(LanguageSymbol);
    let highlights = getContext<HighlightContext>(HighlightSymbol);
    let hovered = getContext<HoveredContext>(HoveredSymbol);
    let dragged = getContext<DraggedContext>(DraggedSymbol);

    $: primaryConflicts = node === undefined ? [] : $caret?.source.getPrimaryConflictsInvolvingNode(node) ?? [];
    $: secondaryConflicts = node === undefined ? [] : $caret?.source.getSecondaryConflictsInvolvingNode(node) ?? [];
    $: isBeingDragged = $dragged === node;

    let element: HTMLElement | null = null;

    let mouseDown = false;

    $: outline = node && element && (isBeingDragged || $highlights?.has(node)) ? createRowOutlineOf(element) : undefined;

</script>

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined}
    <div 
        class="{node.constructor.name} node-view {block ? "block" : "inline"} {primaryConflicts.length > 0 ? "primary-conflict" : ""} {secondaryConflicts.length > 0 ? "secondary-conflict" : ""} {$hovered === node ? "hovered" : ""} {isBeingDragged ? "dragged" : ""}"
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
                const draggable = !(root instanceof Token) && (root === node || root instanceof Program);
                if(draggable && event.buttons === 1 && mouseDown) { dragged.set(node); event.stopPropagation()} 
            }
        }}
    ><svelte:component this={getNodeView(node)} node={node} />{#if outline }<svg class={`selection selected`} style={`top: ${outline.miny}; left: ${outline.minx}; `} width={outline.maxx - outline.minx} height={outline.maxy - outline.miny} viewBox={`${outline.minx} ${outline.miny} ${outline.maxx - outline.minx} ${outline.maxy - outline.miny}`}><path d={outline.path}/></svg>{/if}{#if primaryConflicts.length > 0}<div class="conflicts">{#each primaryConflicts as conflict}<div class="conflict">{conflict.getExplanation($languages[0])}</div>{/each}</div>{/if}</div>
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

    :global(.editor .dragged > .node-view) {
        opacity: 0;
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
    .selection {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 0;
    }
    
    .selection path {
        fill: var(--color-blue);
        stroke: var(--wordplay-border-color);
        stroke-width: var(--wordplay-border-width);
        stroke-linejoin: round;
    }

    .selection.step path {
        stroke: var(--wordplay-highlight);
    }

    .selection.exception path {
        stroke: var(--wordplay-error);
    }

    .selection.selected path {
        stroke: var(--color-blue);
    }

</style>