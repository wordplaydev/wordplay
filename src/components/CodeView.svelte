<script lang="ts">
    import type Concept from "../concepts/Concept";
    import RootView from "../editor/RootView.svelte";
    import { getPalettePath } from "../editor/util/Contexts";
    import { languages } from "../models/languages";
    import type Node from "../nodes/Node";
    import { selectTranslation } from "../nodes/Translations";
    import Note from "./Note.svelte";

    export let node: Node;
    export let concept: Concept;
    export let describe: boolean = true;
    export let border: boolean = true;
    export let selectable: boolean = false;

    $: draggable = concept.getNodes().has(node);

    function select(event: MouseEvent | KeyboardEvent) {
        if(selectable && selection) {
            // If the concept is already in the selection, pop back to it.
            if($selection.includes(concept)) {
                while($selection.at(-1) !== concept)
                    $selection.pop();
                selection.set( [ ... $selection ]);
            }
            else {
                selection.set( [ ...$selection, concept ]);
            }
            // Don't let the palette handle it.
            event.stopPropagation();
        }
    }

    $: selection = getPalettePath();

</script>

<div class="code" 
    class:draggable
    class:border
>
    <div class="root">
        <RootView {node}/>
    </div>
    {#if describe}
        <div class="description"
            class:selectable
            tabIndex={selectable ? 0 : null }
            on:mousedown={select}
            on:keydown={event => event.key === "Enter" || event.key === " " ? select(event) : undefined }        
        >
            <Note>{selectTranslation(node.getDescriptions(concept.context), $languages)}</Note>
        </div>
    {/if}
</div>

<style>
    .code {
        display: inline-block;
    }

    .code.border {
        margin-bottom: var(--wordplay-spacing);
        margin-right: var(--wordplay-spacing);
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

    .description.selectable {
        cursor: pointer;
    }

    .description.selectable {
        border-bottom: var(--wordplay-border-color) solid var(--wordplay-border-width);
    }

    .description.selectable:hover {
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

