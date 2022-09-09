<script lang="ts">
    import { caret, project } from "../models/stores";
    import type Node from "../nodes/Node";

    export let node: Node;
    export let block: boolean = false;
    export let mousedown: undefined | ((event: MouseEvent) => void) = undefined;

    $: conflicts = $project?.getConflictsInvolvingNode(node) ?? [];

</script>

<div 
    class="{node.constructor.name} node-view {$caret?.position === node ? "selected" : ""} {block ? "block" : "inline"} {conflicts.length > 0 ? "conflicted" : ""}"
    on:mousedown={mousedown}>
    <slot/>{#if conflicts.length > 0}<div class="conflicts">{conflicts.toString()}</div>{/if}
</div>
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

    .conflicted {
        border-bottom: 1px solid var(--wordplay-error);
    }

    .conflicts {
        position: absolute;
        top: 100%;
        left: 0;
        border: 2px solid var(--wordplay-error);
        font-size: x-small;
        background-color: var(--wordplay-background);
        z-index: 2;
        visibility: hidden;
    }

    .node-view:hover > .conflicts {
        visibility: visible;
    }

</style>