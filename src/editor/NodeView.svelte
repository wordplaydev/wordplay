<script lang="ts">
    import { caret, project } from "../models/stores";
    import type Node from "../nodes/Node";

    export let node: Node;
    export let block: boolean = false;
    export let mousedown: undefined | ((event: MouseEvent) => void) = undefined;

    $: conflicts = $project?.getConflictsInvolvingNode(node) ?? [];

</script>

<div 
    class="{node.constructor.name} node-view {$caret?.position === node ? "selected" : ""} {block ? "block" : "inline"} {conflicts.length > 0 ? "conflicts" : ""}"
    on:mousedown={mousedown}>
    <slot/>
</div>

<style>

    .node-view {
        border-top-left-radius: var(--wordplay-editor-radius);
        border-bottom-right-radius: var(--wordplay-editor-radius);
        font-family: "Noto Sans Mono", monospace;
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

    .conflicts {
        outline: solid 2px red;
    }

</style>