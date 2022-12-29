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
    import { nativeTypeEntries, nonNativeStructureToEntry, outputTypeEntries } from "./TypeEntries";
    import type { TypeEntry } from "./TypeEntries";
    import TypeCategoryView from "./TypeCategoryView.svelte";
    import TypeView from "./TypeView.svelte";
    import { constructs } from "./ConstructEntries";
    import { setContext } from "svelte";
    import ConstructsView from "./ConstructsView.svelte";

    export let hidden: boolean;

    /**
     * The palette is hybrid documentation/drag and drop palette, organized by types.
     * Each type has a dedicated page that lists 1) language constructs associated with the type,
     * 2) functions on the type. It includes any creator-defined types and borrowed types in the active project.
     */

    $: customEntries = [ $project.main, ...$project.supplements ]
        .map(source => 
            (source.expression.nodes(n => n instanceof StructureDefinition) as StructureDefinition[])
            .map(def => nonNativeStructureToEntry("project", def))).flat();

    $: entries = [ 
        ... customEntries,
        ... nativeTypeEntries,
        ... outputTypeEntries
    ]

    let dragged = getDragged();
    
    let selected: TypeEntry | undefined = undefined;

    // Set a context that stores a project context for nodes in the palette to use.
    $: setContext("context", $project.getContext($project.main));

    /** Search through the entries to find a corresponding node */
    function idToNode(id: number): Node | undefined {
        // Search all entries for a matching node.
        for(const entry of entries) {
            if(entry.name.id === id) return entry.name;
            for(const literal of entry.creators)
                if(literal.id === id) return literal;
            for(const construct of entry.constructs)
                if(construct.id === id) return construct;
            for(const fun of entry.functions)
                if(fun.id === id) return fun;
        }
        for(const construct of constructs) {
            if(construct.example.id === id)
                return construct.example;
        }
        return undefined;
    }

    function handleMouseDown(event: MouseEvent) {

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

    function handleSelection(event: CustomEvent<{ entry: TypeEntry }>) {
        selected = event.detail.entry;
    }

</script>

<!-- Drop what's being dragged if the window loses focus. -->
<svelte:window on:blur={ () => dragged.set(undefined) } />

<section 
    class="palette"
    class:hidden
    on:mousedown={handleMouseDown}
    on:mouseup={handleDrop}
    transition:fly={{ x: -200 }}
>
    {#if selected }
        <section class="type">
            <Button 
                label={{ eng: "back" , "😀": WRITE }}
                tip={{ eng: "Return to the types menu.", "😀": WRITE }}
                action={() => selected = undefined } 
            />
            <TypeView entry={selected} />
        </section>
    {:else}
        <ConstructsView entries={constructs} />
        <section class="types">
            <TypeCategoryView category="project" entries={customEntries} on:selected={handleSelection} />
            <TypeCategoryView category="data" entries={nativeTypeEntries} on:selected={handleSelection} />
            <TypeCategoryView category="output" entries={outputTypeEntries} on:selected={handleSelection} />
        </section>
    {/if}
</section>

<style>
    .palette {
        flex: 1;
        
        z-index: var(--wordplay-layer-palette);
        overflow-y: scroll;

        background-color: var(--wordplay-background);

        padding: var(--wordplay-spacing);
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

</style>