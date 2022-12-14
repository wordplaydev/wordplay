<svelte:options immutable={true}/>

<script lang="ts">
    import { afterUpdate } from "svelte";
    import { languages } from "../models/languages";
    import type Node from "../nodes/Node";
    import { getHighlights, getCaret, getRoot } from "./util/Contexts";
    import NodeHighlight from "./NodeHighlight.svelte";
    import getNodeView from "./util/nodeToView";
    import getOutlineOf, { getUnderlineOf, type Outline } from "./util/outline";
    import { project, currentStep, playing } from '../models/stores';
    import Expression from "../nodes/Expression";
    import ValueView from "../components/ValueView.svelte";
    import type Value from "../runtime/Value";
    import Space from "./Space.svelte";
    import type Token from "../nodes/Token";
    
    export let node: Node | undefined;
    export let root: boolean = false;

    let highlights = getHighlights();
    let caret = getCaret();

    $: primaryConflicts = node === undefined ? [] : $project.getPrimaryConflictsInvolvingNode(node) ?? [];
    $: highlightTypes = (node ? $highlights?.get(node) : undefined) ?? new Set();
    let value: Value | undefined;
    $: {
        $currentStep;
        // Show a value if 1) it's an expression, 2) the evaluator is stepping, 3) it's not involved in the evaluation stack
        // and 4) the node's evaluation is currently evaluating. Start by assuming there isn't a value.
        value = undefined;
        if(node instanceof Expression && !$playing && !node.isEvaluationInvolved()) {
            const root = $project.get(node)?.getEvaluationRoot();
            const evaluation = root ? $project.evaluator.getEvaluationOf(root) : undefined;
            if(evaluation)
                value = $project.evaluator.getLatestValueOf(node, evaluation.getStepNumber());
        }
    }

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

    $: rootTree = getRoot();
    $: leaf = node?.getFirstLeaf() as Token | undefined;
    $: isSpaceRoot = node && leaf ? $rootTree?.get(leaf)?.getSpaceRoot() === node : undefined;
    $: space = leaf && isSpaceRoot && $caret ? $caret.source.spaces.getSpace(leaf) : "";
    $: additional = 
        // No node or no first token, no additional space
        !isSpaceRoot || node === undefined || leaf === undefined ? undefined :
        // In an editor? Use the existing space
        $caret ? $caret.source.spaces.getAdditionalSpace(leaf, $caret.source.get(leaf)?.getPreferredPrecedingSpace() ?? "") : 
        // Not in an editor? Just use the preferred space
        $rootTree?.get(leaf)?.getPreferredPrecedingSpace();

</script>

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined}
    <!-- Render space preceding this node if it is the highest ancestor of its first token, ensuring the space is outside of the node's view -->
    {#if leaf && additional !== undefined}<Space token={leaf} {space} {additional}/>{/if}<div 
        class="{node.constructor.name} node-view {root ? "root" : ""} {highlightTypes.size > 0 ? "highlighted" : ""} { Array.from(highlightTypes).join(" ")}"
        data-id={node.id}
        bind:this={element}
    >{#if value}<ValueView {value}/>{:else}<svelte:component this={getNodeView(node)} node={node} />{#if outline && underline }<NodeHighlight {outline} {underline}/>{/if}{#if primaryConflicts.length > 0}<div class="conflicts">{#each primaryConflicts as conflict}<div class="conflict">{conflict.getExplanation($languages[0])}</div>{/each}</div>{/if}{/if}</div>
{/if}

<style>

    .node-view {
        display: inline;
        position: relative;
        border-top-left-radius: var(--wordplay-editor-radius);
        border-bottom-right-radius: var(--wordplay-editor-radius);
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