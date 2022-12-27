<svelte:options immutable={true}/>
<script lang="ts">
    import type Node from "../nodes/Node";
    import { getSpace } from "./util/Contexts";
    import getNodeView from "./util/nodeToView";
    import { project, currentStep, playing } from '../models/stores';
    import Expression from "../nodes/Expression";
    import ValueView from "../components/ValueView.svelte";
    import type Value from "../runtime/Value";
    import Space from "./Space.svelte";
    
    export let node: Node | undefined;

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

    // Get the root's computed spaces store
    let spaces = getSpace();
    // See if this node has any to render.
    $: space = node ? $spaces.get(node) : undefined;

</script>

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined}
    <!-- Render space preceding this node, if any, then either a value view if stepping or the node. -->
    {#if space }<Space {...space} />{/if}<div class="{node.constructor.name} node-view" data-id={node.id}>{#if value}<ValueView {value}/>{:else}<svelte:component this={getNodeView(node)} node={node} />{/if}</div>
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