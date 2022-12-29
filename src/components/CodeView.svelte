<script lang="ts">
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import type Concept from "../concepts/Concept";
    import RootView from "../editor/RootView.svelte";
    import { languages } from "../models/languages";
    import type Context from "../nodes/Context";
    import type Node from "../nodes/Node";
    import { selectTranslation } from "../nodes/Translations";
    import Note from "./Note.svelte";

    export let node: Node;
    export let concept: Concept;
    export let describe: boolean = true;
    export let selectable: boolean = false;

    $: draggable = !selectable && concept.getNodes().has(node);

    function select(event: MouseEvent | KeyboardEvent) {
        if(selectable && selection) {
            selection.set(concept);
            // Don't let the palette handle it.
            event.stopPropagation();
        }
    }

    $: context = getContext<Context>("context");
    $: selection = getContext<Writable<Concept | undefined>>("selection");

</script>

<div class="code" 
    class:selectable
    class:draggable
    tabIndex={selectable ? 0 : null }
    on:mousedown={select}
    on:keydown={event => event.key === "Enter" || event.key === " " ? select(event) : undefined }    
>
    <div class="root">
        <RootView {node}/>
    </div>
    {#if describe}
        <Note>{selectTranslation(node.getDescriptions(concept.context ?? context), $languages)}</Note>
    {/if}
</div>

<style>
    .code {
        display: inline-block;
        margin-bottom: var(--wordplay-spacing);
        margin-right: var(--wordplay-spacing);
    }

    .code.draggable {
        padding: var(--wordplay-spacing);
        border-radius: calc(2 * var(--wordplay-border-radius)) var(--wordplay-border-radius) var(--wordplay-border-radius) calc(2 * var(--wordplay-border-radius));
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: calc(2 * var(--wordplay-border-radius)) var(--wordplay-border-radius) var(--wordplay-border-radius) calc(2 * var(--wordplay-border-radius));
    }

    .root {
        display: inline-block;
        cursor: pointer;
    }
    
    .draggable .root:hover {
        animation: wobble 0.25s ease-out infinite;
    }

    .code.selectable {
        cursor: pointer;
    }

    .code.selectable .root {
        border-bottom: var(--wordplay-border-color) solid var(--wordplay-border-width);
    }

    .code.selectable:hover .root {
        border-bottom-color: var(--wordplay-highlight);
    }

    .code:focus .root {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
    }
    .code:focus {
        outline: none;
    }


    @keyframes wobble {
        0% { transform: rotate(5deg); }
        50% { transform: rotate(-5deg); }
        100% { transform: rotate(5deg); }
    }

</style>

