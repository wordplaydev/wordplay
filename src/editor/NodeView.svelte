<script lang="ts">
    import { getContext } from "svelte";
    import type { Writable } from "svelte/types/runtime/store";
    import type Caret from "../models/Caret";
    import type Node from "../nodes/Node";
    import nodeToView from "./nodeToView";
    import UnknownNodeView from "./UnknownNodeView.svelte";

    export let node: Node | undefined;
    export let block: boolean = false;
    export let mousedown: undefined | ((event: MouseEvent) => void) = undefined;

    $: caret = getContext<Writable<Caret>>("caret");

    $: primaryConflicts = node === undefined ? [] : $caret.source.getPrimaryConflictsInvolvingNode(node) ?? [];
    $: secondaryConflicts = node === undefined ? [] : $caret.source.getSecondaryConflictsInvolvingNode(node) ?? [];

</script>

<!-- Don't render anything if we weren't given a node. TODO Interface for replacing with a slot. -->
{#if node !== undefined}
<div 
    class="{node.constructor.name} node-view {block ? "block" : "inline"} {primaryConflicts.length > 0 ? "primary-conflict" : ""} {secondaryConflicts.length > 0 ? "secondary-conflict" : ""}"
    data-id={node.id}
    on:mousedown={mousedown}
><svelte:component this={nodeToView.get(node.constructor) ?? UnknownNodeView} node={node} />{#if primaryConflicts.length > 0}<div class="conflicts">{#each primaryConflicts as conflict}<div class="conflict">{conflict.getExplanation("eng")}</div>{/each}</div>{/if}</div>
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

</style>