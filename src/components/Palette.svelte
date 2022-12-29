<script lang="ts">
    import { getDragged } from "../editor/util/Contexts";
    import { project, updateProject } from "../models/stores";
    import ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
    import StructureDefinition from "../nodes/StructureDefinition";
    import Expression from "../nodes/Expression";
    import Tree from "../nodes/Tree";
    import { WRITE } from "../nodes/Translations";
    import Button from "./Button.svelte";
    import Source from "../models/Source";
    import { fly } from "svelte/transition";
    import type Node from "../nodes/Node";
    import ConceptsView from "./ConceptsView.svelte";
    import StructureConceptView from "./StructureConceptView.svelte";
    import { setContext } from "svelte";
    import ConstructsConceptsView from "./ConstructConceptsView.svelte";
    import { ConstructConcepts, NativeConcepts, OutputConcepts } from "../concepts/DefaultConcepts";
    import StructureConcept from "../concepts/StructureConcept";
    import FunctionDefinition from "../nodes/FunctionDefinition";
    import FunctionConcept from "../concepts/FunctionConcept";
    import Bind from "../nodes/Bind";
    import BindConcept from "../concepts/BindConcept";
    import type Concept from "../concepts/Concept";
    import { writable, type Writable } from "svelte/store";
    import FunctionConceptView from "./FunctionConceptView.svelte";
    import BindConceptView from "./BindConceptView.svelte";
    import StreamConcept from "../concepts/StreamConcept";
    import CodeView from "./CodeView.svelte";
    import ConversionConcept from "../concepts/ConversionConcept";
    import ConversionConceptView from "./ConversionConceptView.svelte";
    import StreamConceptView from "./StreamConceptView.svelte";

    export let hidden: boolean;

    let palette: HTMLElement | undefined;

    /**
     * The palette is hybrid documentation/drag and drop palette, organized by types.
     * Each type has a dedicated page that lists 1) language constructs associated with the type,
     * 2) functions on the type. It includes any creator-defined types and borrowed types in the active project.
     */

    $: projectConcepts = [ $project.main, ...$project.supplements ]
        .map(source => (source.expression.nodes(n => n instanceof StructureDefinition) as StructureDefinition[])
            .map(def => new StructureConcept(def, undefined, [], $project.getContext(source))))
        .flat();

    $: projectFunctions = [ $project.main, ...$project.supplements ]
        .map(source => (source.expression.expression.statements.filter((n): n is FunctionDefinition => n instanceof FunctionDefinition))
            .map(def => new FunctionConcept(def, $project.getContext(source), undefined, )))
        .flat();

    $: projectBinds = [ $project.main, ...$project.supplements ]
        .map(source => (source.expression.expression.statements.filter((n): n is Bind => n instanceof Bind))
            .map(def => new BindConcept(def, $project.getContext(source))))
        .flat();

    $: streams = $project.getAllStreams().map(s => new StreamConcept(s, $project.getContext($project.main)));

    $: concepts = [ 
        ... projectConcepts,
        ... ConstructConcepts,
        ... NativeConcepts,
        ... OutputConcepts,
        ... streams
    ]

    let dragged = getDragged();
    
    let selected: Writable<Concept | undefined> = writable(undefined);
    setContext("selection", selected);

    // Set a context that stores a project context for nodes in the palette to use.
    $: setContext("context", $project.getContext($project.main));

    /** Search through the entries to find a corresponding node */
    function idToNode(id: number): Node | undefined {
        // Search all entries for a matching node.
        for(const concept of concepts) {
            const match = concept.getNode(id);
            if(match)
                return match;
        }
        return undefined;
    }

    function handleMouseDown(event: MouseEvent) {

        palette?.focus();

        if(event.buttons !== 1) return;

        // Map the element to the coresponding node in the palette.
        const root = document.elementFromPoint(event.clientX, event.clientY)?.closest(".root")?.querySelector(".node-view");
        if(root instanceof HTMLElement) {
            const node = idToNode(parseInt(root.dataset.id ?? ""));
            if(node !== undefined) {
                dragged.set(new Tree(node));
            }
        }

    }

    // When a creator drops on the palette, remove the dragged node from the source it was dragged from.
    function handleDrop() {

        const node: Tree | undefined = $dragged;

        // Release the dragged node.
        dragged.set(undefined);

        // No node released? We're done.
        if(node === undefined) return;

        // See if we can remove the node from it's root.
        const source = node.getRoot();
        if(!(source instanceof Source)) return;

        // Figure out what to replace the dragged node with. By default, we remove it.
        const type = node.node instanceof Expression ? node.node.getType($project.getContext(source)) : undefined;
        let replacement = node.node instanceof Expression && !node.inList() ? ExpressionPlaceholder.make(type) : undefined;

        // Update the project with the new source files
        updateProject(
            $project.withSource(
                source, 
                source.withProgram(
                    source.expression.clone(node.node, replacement),
                    source.spaces.withReplacement(node.node, replacement)
                )
            )
        );

    }

</script>

<!-- Drop what's being dragged if the window loses focus. -->
<svelte:window on:blur={ () => dragged.set(undefined) } />

<section 
    class="palette"
    class:hidden
    on:mousedown={handleMouseDown}
    on:mouseup={handleDrop}
    tabIndex=0
    on:keydown={event => event.key === "Escape" || event.key === "Backspace" ? selected.set(undefined) : undefined }
    transition:fly={{ x: -200 }}
    bind:this={palette}
>
    {#if $selected }
        <section class="type">
            <div class="back">
                <Button 
                    label={{ eng: "◁" , "😀": WRITE }}
                    tip={{ eng: "Return to the types menu.", "😀": WRITE }}
                    action={() => selected.set(undefined) } 
                />
            </div>
            {#if $selected instanceof StructureConcept }
                <StructureConceptView concept={$selected} />
            {:else if $selected instanceof FunctionConcept }
                <FunctionConceptView concept={$selected} />
            {:else if $selected instanceof BindConcept }
                <BindConceptView concept={$selected} />
            {:else if $selected instanceof ConversionConcept }
                <ConversionConceptView concept={$selected} />
            {:else if $selected instanceof StreamConcept }
                <StreamConceptView concept={$selected} />
            {:else}
                <CodeView node={$selected.getRepresentation()} concept={$selected} />
            {/if}
        </section>
    {:else}
        <ConstructsConceptsView concepts={ConstructConcepts} />
        <ConceptsView category="project" concepts={[ ... projectConcepts, ...projectBinds, ... projectFunctions ]} />
        <ConceptsView category="data" concepts={NativeConcepts} />
        <ConceptsView category="input" concepts={streams} />
        <ConceptsView category="output" concepts={OutputConcepts} />
    {/if}
</section>

<style>
    .palette {
        flex: 1;
        
        z-index: var(--wordplay-layer-palette);
        overflow-y: scroll;

        background-color: var(--wordplay-background);

        padding: calc(2 * var(--wordplay-spacing));
        user-select: none;

        transition: width 0.25s ease-out, visibility 0.25s ease-out, opacity 0.25s ease-out;

    }

    .palette.hidden {
        width: 0;
        opacity: 0;
        padding: 0;
        border: 0;
        visibility: hidden;
    }

    .palette:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    .back {
        position: sticky;
        top: var(--wordplay-spacing);
        z-index: var(--wordplay-layer-controls);
    }

</style>