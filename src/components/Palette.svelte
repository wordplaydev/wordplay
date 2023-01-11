<script lang="ts">
    import {
        getDragged,
        PaletteIndexSymbol,
        PalettePathSymbol,
        type PaletteIndexContext,
        type PalettePathContext,
    } from '../editor/util/Contexts';
    import { project, updateProject } from '../models/stores';
    import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
    import Expression from '../nodes/Expression';
    import Tree from '../nodes/Tree';
    import Button from './Button.svelte';
    import Source from '../nodes/Source';
    import { fly } from 'svelte/transition';
    import ConceptsView from './ConceptsView.svelte';
    import StructureConceptView from './StructureConceptView.svelte';
    import { setContext } from 'svelte';
    import StructureConcept from '../concepts/StructureConcept';
    import FunctionConcept from '../concepts/FunctionConcept';
    import BindConcept from '../concepts/BindConcept';
    import type Concept from '../concepts/Concept';
    import { writable } from 'svelte/store';
    import FunctionConceptView from './FunctionConceptView.svelte';
    import BindConceptView from './BindConceptView.svelte';
    import StreamConcept from '../concepts/StreamConcept';
    import CodeView from './CodeView.svelte';
    import ConversionConcept from '../concepts/ConversionConcept';
    import ConversionConceptView from './ConversionConceptView.svelte';
    import StreamConceptView from './StreamConceptView.svelte';
    import KeyboardIdle from '../editor/util/KeyboardIdle';
    import type Project from '../models/Project';
    import NodeConcept from '../concepts/NodeConcept';
    import ConceptIndex from '../concepts/ConceptIndex';
    import type Node from '../nodes/Node';
    import { preferredTranslations } from '../translation/translations';
    import NodeConceptView from './NodeConceptView.svelte';
    import Purpose from '../concepts/Purpose';
    import DescriptionView from './DescriptionView.svelte';

    export let hidden: boolean;

    let palette: HTMLElement | undefined;

    /**
     * The palette is hybrid documentation/drag and drop palette, organized by types.
     * Each type has a dedicated page that lists 1) language constructs associated with the type,
     * 2) functions on the type. It includes any creator-defined types and borrowed types in the active project.
     */

    let latestProject: Project | undefined;

    let index: PaletteIndexContext = writable(
        new ConceptIndex([], $preferredTranslations)
    );
    setContext(PaletteIndexSymbol, index);

    $: {
        // When the project changes, languages change, and the keyboard is idle, recompute the concept index.
        if ($KeyboardIdle && latestProject !== $project) {
            latestProject = $project;

            // Make a new concept index with the new project and translations.
            index.set(ConceptIndex.make($project, $preferredTranslations));

            // Map the old path to the new one using concept equality.
            path.set(
                $path
                    .map((concept) => $index.getEquivalent(concept))
                    .filter((c): c is Concept => c !== undefined)
            );
        }
    }

    let dragged = getDragged();

    let path: PalettePathContext = writable([]);
    setContext(PalettePathSymbol, path);

    // Set a context that stores a project context for nodes in the palette to use.
    $: setContext('context', $project.getContext($project.main));

    function handleMouseDown(event: MouseEvent) {
        palette?.focus();

        if (event.buttons !== 1) return;

        // Map the element to the coresponding node in the palette.
        const root = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest('.root')
            ?.querySelector('.node-view');
        if (root instanceof HTMLElement) {
            let node: Node | undefined = $index.getNode(
                parseInt(root.dataset.id ?? '')
            );
            if (node !== undefined) {
                // Set the dragged node to a deep clone of the (it may contain nodes from declarations that we don't want leaking into the program);
                dragged.set(new Tree(node.clone()));
            }
        }
    }

    // When a creator drops on the palette, remove the dragged node from the source it was dragged from.
    function handleDrop() {
        const node: Tree | undefined = $dragged;

        // Release the dragged node.
        dragged.set(undefined);

        // No node released? We're done.
        if (node === undefined) return;

        // See if we can remove the node from it's root.
        const source = node.getRoot();
        if (!(source instanceof Source)) return;

        // Figure out what to replace the dragged node with. By default, we remove it.
        const type =
            node.node instanceof Expression
                ? node.node.getType($project.getContext(source))
                : undefined;
        let replacement =
            node.node instanceof Expression && !node.inList()
                ? ExpressionPlaceholder.make(type)
                : undefined;

        // Update the project with the new source files
        updateProject(
            $project.withSource(
                source,
                source.withProgram(
                    source.expression.replace(node.node, replacement),
                    source.spaces.withReplacement(node.node, replacement)
                )
            )
        );
    }

    function back() {
        $path.pop();
        path.set([...$path]);
    }
</script>

<!-- Drop what's being dragged if the window loses focus. -->
<svelte:window on:blur={() => dragged.set(undefined)} />

<section
    class="palette"
    class:hidden
    on:mousedown={handleMouseDown}
    on:mouseup={handleDrop}
    tabIndex="0"
    on:keydown={(event) =>
        event.key === 'Escape' || event.key === 'Backspace'
            ? back()
            : undefined}
    transition:fly={{ x: -200 }}
    bind:this={palette}
>
    {#if $path.length > 0}
        {@const concept = $path.at(-1)}
        {#if concept}
            <section class="type">
                <div class="back">
                    <Button
                        label="◁"
                        tip={$preferredTranslations[0].ui.tooltip.home}
                        action={back}
                    />
                    {#each $path as concept, index}
                        {#if index > 0}&nbsp;&mdash;&nbsp;{/if}<DescriptionView
                            description={concept.getName(
                                $preferredTranslations[0]
                            )}
                        />
                    {/each}
                </div>
                {#if concept instanceof StructureConcept}
                    <StructureConceptView {concept} />
                {:else if concept instanceof FunctionConcept}
                    <FunctionConceptView {concept} />
                {:else if concept instanceof BindConcept}
                    <BindConceptView {concept} />
                {:else if concept instanceof ConversionConcept}
                    <ConversionConceptView {concept} />
                {:else if concept instanceof StreamConcept}
                    <StreamConceptView {concept} />
                {:else if concept instanceof NodeConcept}
                    <NodeConceptView {concept} />
                {:else}
                    <CodeView node={concept.getRepresentation()} {concept} />
                {/if}
            </section>
        {/if}
    {:else}
        <ConceptsView
            category={$preferredTranslations[0].terminology.project}
            concepts={$index.getPrimaryConceptsWithPurpose(Purpose.PROJECT)}
        />
        <ConceptsView
            category={$preferredTranslations[0].terminology.code}
            concepts={$index.getPrimaryConceptsWithPurpose(Purpose.COMPUTE)}
            selectable={true}
        />
        <ConceptsView
            category={$preferredTranslations[0].terminology.store}
            concepts={$index.getPrimaryConceptsWithPurpose(Purpose.STORE)}
        />
        <ConceptsView
            category={$preferredTranslations[0].terminology.decide}
            concepts={$index.getPrimaryConceptsWithPurpose(Purpose.DECIDE)}
            selectable={true}
        />
        <ConceptsView
            category={$preferredTranslations[0].terminology.input}
            concepts={$index.getPrimaryConceptsWithPurpose(Purpose.INPUT)}
        />
        <ConceptsView
            category={$preferredTranslations[0].terminology.output}
            concepts={$index.getPrimaryConceptsWithPurpose(Purpose.OUTPUT)}
        />
    {/if}
</section>

<style>
    .palette {
        flex: 1;

        z-index: var(--wordplay-layer-palette);
        overflow: scroll;

        background-color: var(--wordplay-background);

        padding: calc(2 * var(--wordplay-spacing));

        transition: width 0.25s ease-out, visibility 0.25s ease-out,
            opacity 0.25s ease-out;
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
        top: 0;
        padding-bottom: var(--wordplay-spacing);
        z-index: var(--wordplay-layer-controls);
        background-color: var(--wordplay-background);
    }
</style>
