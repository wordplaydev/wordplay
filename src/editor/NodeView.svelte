<script lang="ts">
    import { caret, project } from "../models/stores";
    import Node from "../nodes/Node";
    import Exception from "../runtime/Exception";
    import renderNode from "./renderNode";

    export let node: Node | undefined;
    export let block: boolean = false;
    export let mousedown: undefined | ((event: MouseEvent) => void) = undefined;

    $: primaryConflicts = node === undefined || $project === undefined ? [] : $project.getPrimaryConflictsInvolvingNode(node) ?? [];
    $: secondaryConflicts = node === undefined || $project === undefined ? [] : $project.getSecondaryConflictsInvolvingNode(node) ?? [];
    $: value = $project?.getEvaluator().getLatestResult();
    $: executing = 
        $project !== undefined &&
        (($project.getEvaluator().currentStep()?.node === node) || 
         (value instanceof Exception && value.step?.node instanceof Node && value.step.node === node));

</script>

<!-- Don't render anything if we weren't given a node. TODO Interface for replacing with a slot. -->
{#if node !== undefined}
<div 
    class="{node.constructor.name} node-view {$caret?.position === node ? "selected" : ""} {block ? "block" : "inline"} {primaryConflicts.length > 0 ? "primary-conflict" : ""} {secondaryConflicts.length > 0 ? "secondary-conflict" : ""} {executing ? "executing" : ""}"
    data-id={node.id}
    on:mousedown={mousedown}
><svelte:component this={renderNode(node)} node={node} />{#if primaryConflicts.length > 0}<div class="conflicts">{#each primaryConflicts as conflict}<div class="conflict">{conflict.getExplanation("eng")}</div>{/each}</div>{/if}</div>
{/if}

<style>

    .node-view {
        border-top-left-radius: var(--wordplay-editor-radius);
        border-bottom-right-radius: var(--wordplay-editor-radius);
        font-family: "Noto Sans Mono", monospace;
        position: relative;
    }
    
    .node-view.inline {
        display: inline;
    }

    .node-view.block {
        display: inline-block;
    }

    .node-view:hover {
        cursor: pointer;
    }

    .selected {
        outline: 4px solid var(--wordplay-highlight);
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

    .executing {
        outline: 4px solid red;
    }

</style>