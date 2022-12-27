<script lang="ts">
    import { getDragged } from "../editor/util/Contexts";
    import { parseExpression, parseType, toTokens } from "../parser/Parser";
    import { project, updateProject } from "../models/stores";
    import Program from "../nodes/Program";
    import ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
    import { BoolDefinition, ListDefinition, MapDefinition, MeasurementDefinition, NoneDefinition, SetDefinition, TextDefinition } from "../native/NativeBindings";
    import ImplicitShares from "../runtime/ImplicitShares";
    import StructureDefinition from "../nodes/StructureDefinition";
    import type Type from "../nodes/Type";
    import type Expression from "../nodes/Expression";
    import NameType from "../nodes/NameType";
    import type Node from "../nodes/Node";
    import Evaluate from "../nodes/Evaluate";
    import PropertyReference from "../nodes/PropertyReference";
    import Bind from "../nodes/Bind";
    import Reference from "../nodes/Reference";
    import Tree from "../nodes/Tree";
    import RootView from "../editor/RootView.svelte";
    import { WRITE } from "../nodes/Translations";
    import Button from "./Button.svelte";
    import { fly } from "svelte/transition";

    export let hidden: boolean;

    /**
     * The palette is hybrid documentation/drag and drop palette, organized by types.
     * Each type has a dedicated page that lists 1) language constructs associated with the type,
     * 2) functions on the type. It includes any creator-defined types and borrowed types in the active project.
     */

    type TypeEntry = {
        definition: StructureDefinition, 
        creators: Expression[],
        name: Type,
        constructs: Expression[],
        functions: Evaluate[]
    }

    function structureToEntry(literals: Expression[] | undefined, def: StructureDefinition, name: Type, constructs: Expression[]): TypeEntry {
        return { 
            definition: def,
            creators: literals ?? [ Evaluate.make(
                Reference.make(def.names.names[0].name.getText()),
                def.inputs.filter(input => input instanceof Bind && !input.hasDefault()).map(() => new ExpressionPlaceholder())
            ) ],
            name: name,
            constructs: constructs,
            // Map each function to an Evaluate with placeholders for the structure and required arguments
            functions: def.getFunctions(true).map(fun => 
                Evaluate.make(
                    PropertyReference.make(new ExpressionPlaceholder(), Reference.make(fun.names.names[0].name.getText())),
                    fun.inputs.filter(input => input instanceof Bind && !input.hasDefault()).map(() => new ExpressionPlaceholder())
                )
            )
        };
    }

    function nativeStructureToEntry(def: StructureDefinition, literals: string[], type: string, constructs: string[]): TypeEntry {
        return structureToEntry(
            literals.map(literal => parseExpression(toTokens(literal)) as Expression),
            def, 
            parseType(toTokens(type)) as Type,
            constructs.map(construct => parseExpression(toTokens(construct)) as Expression)
        );
    }

    function nonNativeStructureToEntry(def: StructureDefinition): TypeEntry {
        return structureToEntry(
            undefined,
            def, 
            new NameType(def.names.names[0].name.getText()),
            []
        );
    }

    let entries: TypeEntry[] = [
        nativeStructureToEntry(BoolDefinition, [ "⊤", "⊥" ], "?", [ "_ ? _ _" ]),
        nativeStructureToEntry(TextDefinition, [ '""' ], '""', [ "'\\_\\'" ]),
        nativeStructureToEntry(MeasurementDefinition, [ "0", "π", "∞" ], '#', [ "_[ _ ]" ]),
        nativeStructureToEntry(ListDefinition, [ '[]' ], '[]', [ "_[ _ ]" ]),
        nativeStructureToEntry(SetDefinition, [ '{}' ], '{}', [ "_{ _ }" ]),
        nativeStructureToEntry(MapDefinition, [ '{:}' ], '{:}', [ "_{ _ }" ]),
        nativeStructureToEntry(NoneDefinition, [ "!" ], "!", [ "_ ? _ _" ]),
        
        ...ImplicitShares.filter((s): s is StructureDefinition => s instanceof StructureDefinition).map(def => nonNativeStructureToEntry(def)),

        ...[ $project.main, ...$project.supplements ]
            .map(source => 
                (source.expression.nodes(n => n instanceof StructureDefinition) as StructureDefinition[])
                .map(def => nonNativeStructureToEntry(def))).flat()

    ];

    let dragged = getDragged();
    let selected: TypeEntry | undefined = undefined;

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
        return undefined;
    }

    function handleDrag(event: MouseEvent) {

        if(event.buttons !== 1 || $dragged) return;

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

        if($dragged === undefined) return;

        const program = $dragged.getRoot();
        if(!(program instanceof Program)) return;

        // Find the source that contains the dragged root.
        const source = $project.getSourceWithProgram(program);
        if(source === undefined) return;

        // Figure out what to replace the dragged node with. By default, we remove it.
        let replacement = $dragged.inList() ? undefined : new ExpressionPlaceholder();

        // Update the project with the new source files
        updateProject(
            $project.withSource(
                source, 
                source.withProgram(
                    program.replace($dragged.node, replacement),
                    source.spaces.withReplacement($dragged.node, replacement)
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
    on:mouseup={handleDrop}
    on:mousemove={handleDrag}
    transition:fly={{ x: -500 }}
>
    {#if selected }
        <section class="type">
            <Button 
                label={{ eng: "back" , "😀": WRITE }}
                tip={{ eng: "Return to the types menu.", "😀": WRITE }}
                action={() => selected = undefined } 
            />
            <h3>{#each selected.creators as creator, index}{#if index > 0}, {/if}<RootView node={creator}/>{/each}</h3>

            {#each selected.constructs as node }
                <p><RootView {node}/></p>
            {/each}

            {#each selected.functions as node }
                <p><RootView {node}/></p>
            {/each}

        </section>
    {:else}
        <section class="types">
            <h3>Types</h3>

            {#each entries as type}
                <p on:mousedown={() => selected = type}><RootView node={type.name}/></p>
            {/each}
        </section>
    {/if}
</section>

<style>
    .palette {
        z-index: var(--wordplay-layer-controls);
        width: 100%;
        max-width: var(--wordplay-palette-max-width);
        

        overflow-y: scroll;

        background-color: var(--wordplay-background);

        padding: var(--wordplay-spacing);
        user-select: none;
        white-space: nowrap;

        border-right: var(--wordplay-border-width) solid var(--wordplay-border-color);
        transition: width 0.25s ease-out, visibility 0.25s ease-out, opacity 0.25s ease-out;

    }

    .palette.hidden {
        width: 0;
        opacity: 0;
        visibility: hidden;
    }

    p {
        cursor: pointer;
    }

</style>