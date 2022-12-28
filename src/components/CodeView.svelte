<script lang="ts">
    import { getContext } from "svelte";
    import RootView from "../editor/RootView.svelte";
    import type Context from "../nodes/Context";
    import type Node from "../nodes/Node";
    import DocsView from "./Note.svelte";

    export let node: Node;
    export let docs: boolean = true;
    export let interactive: boolean = false;
    
    let context = getContext<Context>("context");

</script>

<div class="code" class:interactive>
    <RootView {node}/>
    {#if docs}
        <DocsView docs={node.getDescriptions(context).eng}/>
    {/if}
</div>

<style>

    .code {
        display: inline-block;
        padding: var(--wordplay-spacing);
        border-radius: calc(2 * var(--wordplay-border-radius)) var(--wordplay-border-radius) var(--wordplay-border-radius) calc(2 * var(--wordplay-border-radius));
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: calc(2 * var(--wordplay-border-radius)) var(--wordplay-border-radius) var(--wordplay-border-radius) calc(2 * var(--wordplay-border-radius));
        cursor: pointer;
    }

    .code.interactive:hover {
        background-color: var(--wordplay-highlight);
    }

    .code.interactive:hover :global(.text) {
        color: var(--color-white) !important; 
    }

</style>