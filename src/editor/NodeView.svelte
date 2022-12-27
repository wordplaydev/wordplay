<svelte:options immutable={true}/>
<script lang="ts">
    import type Node from "../nodes/Node";
    import { getCaret, getRoot } from "./util/Contexts";
    import getNodeView from "./util/nodeToView";
    import { project, currentStep, playing } from '../models/stores';
    import Expression from "../nodes/Expression";
    import ValueView from "../components/ValueView.svelte";
    import type Value from "../runtime/Value";
    import Space from "./Space.svelte";
    import type Token from "../nodes/Token";
    
    export let node: Node | undefined;
    export let root: boolean = false;

    let caret = getCaret();

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

    $: rootTree = getRoot();
    $: leaf = node?.getFirstLeaf() as Token | undefined;
    $: isSpaceRoot = node && leaf ? $rootTree?.get(leaf)?.getSpaceRoot() === node : undefined;
    $: space = leaf && isSpaceRoot && $caret ? $caret.source.spaces.getSpace(leaf) : "";
    $: additional = 
        // No node or no first token, no additional space
        !isSpaceRoot || node === undefined || leaf === undefined ? undefined :
        // In an editor whose source contains this node? Use the existing space
        $caret && $caret.source.contains(leaf) ? $caret.source.spaces.getAdditionalSpace(leaf, $caret.source.get(leaf)?.getPreferredPrecedingSpace() ?? "") : 
        // Not in an editor? Just use the preferred space for the node, pretty printing it
        $rootTree?.get(leaf)?.getPreferredPrecedingSpace();

</script>

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined}
    <!-- Render space preceding this node if it is the highest ancestor of its first token, ensuring the space is outside of the node's view -->
    {#if leaf && additional !== undefined}<Space token={leaf} {space} {additional}/>{/if}<div 
        class="{node.constructor.name} node-view {root ? "root" : ""}"
        data-id={node.id}
    >{#if value}<ValueView {value}/>{:else}<svelte:component this={getNodeView(node)} node={node} />{/if}</div>
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

    /* When beginning dragged in an editor, hide the node view contents to create a sense of spatial integrity. */
    .dragged :global(.token-view) {
        opacity: 0;
    }
    .dragged :global(.highlight) {
        opacity: .2;
    }

</style>