<script lang="ts">
    import { caret } from "../models/stores";
    import type Node from "../nodes/Node";

    export let node: Node;
    export let block: boolean = false;

</script>

{#if block}
    <div class="node-view {$caret?.position === node ? "selected" : ""}">
        <slot/>
    </div>
{:else}
    <span class="node-view {$caret?.position === node ? "selected" : ""}">
        <slot/>
    </span>
{/if}

<style>

    .node-view {
        border-top-left-radius: var(--wordplay-editor-radius);
        border-bottom-right-radius: var(--wordplay-editor-radius);
        font-family: "Noto Sans Mono", monospace;
    }

    .node-view:hover {
        cursor: pointer;
    }

    .selected {
        outline: 4px solid var(--wordplay-highlight);
    }
</style>