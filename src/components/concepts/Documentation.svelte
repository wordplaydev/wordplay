<script lang="ts">
    import {
        getDragged,
        getProject,
        getConceptIndex,
        getConceptPath,
    } from '../project/Contexts';
    import { updateProject } from '../../models/stores';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import Expression from '@nodes/Expression';
    import Tree from '@nodes/Tree';
    import Button from '../widgets/Button.svelte';
    import Source from '@nodes/Source';
    import ConceptsView from './ConceptsView.svelte';
    import StructureConceptView from './StructureConceptView.svelte';
    import { setContext } from 'svelte';
    import StructureConcept from '@concepts/StructureConcept';
    import FunctionConcept from '@concepts/FunctionConcept';
    import BindConcept from '@concepts/BindConcept';
    import type Concept from '@concepts/Concept';
    import FunctionConceptView from './FunctionConceptView.svelte';
    import BindConceptView from './BindConceptView.svelte';
    import StreamConcept from '@concepts/StreamConcept';
    import CodeView from './CodeView.svelte';
    import ConversionConcept from '@concepts/ConversionConcept';
    import ConversionConceptView from './ConversionConceptView.svelte';
    import StreamConceptView from './StreamConceptView.svelte';
    import NodeConcept from '@concepts/NodeConcept';
    import type Node from '@nodes/Node';
    import { preferredTranslations } from '@translation/translations';
    import NodeConceptView from './NodeConceptView.svelte';
    import Purpose from '@concepts/Purpose';
    import DescriptionView from './DescriptionView.svelte';
    import { tick } from 'svelte';
    import TextField from '../widgets/TextField.svelte';

    let palette: HTMLElement | undefined;

    let project = getProject();

    /**
     * The palette is hybrid documentation/drag and drop palette, organized by types.
     * Each type has a dedicated page that lists 1) language constructs associated with the type,
     * 2) functions on the type. It includes any creator-defined types and borrowed types in the active project.
     */

    let index = getConceptIndex();
    let path = getConceptPath();

    let dragged = getDragged();

    let query: string = '';
    let results: [Concept, [string, number][]][] | undefined = undefined;

    $: currentConcept = $path[$path.length - 1];

    // Set a context that stores a project context for nodes in the palette to use.
    // Keep it up to date as the project changes.
    $: setContext(
        'context',
        $project ? $project.getContext($project.main) : undefined
    );

    async function scrollToTop() {
        if (palette) {
            await tick();
            palette.scrollTop = 0;
        }
    }

    // When the path changes, wait for rendering, then scroll to the top.
    $: {
        if ($path.length > 0) {
            scrollToTop();
            query = '';
            results = undefined;
        }
    }

    function handleMouseDown(event: MouseEvent) {
        palette?.focus();

        if (event.buttons !== 1) return;

        // Map the element to the coresponding node in the palette.
        const nodes = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest('.root:not(.inert)')
            ?.querySelectorAll('.node-view');
        if (nodes) {
            for (const root of nodes) {
                if (root instanceof HTMLElement) {
                    let node: Node | undefined = $index?.getNode(
                        parseInt(root.dataset.id ?? '')
                    );
                    if (node !== undefined) {
                        // Set the dragged node to a deep clone of the (it may contain nodes from declarations that we don't want leaking into the program);
                        dragged.set(new Tree(node.clone()));
                        break;
                    }
                }
            }
        }
    }

    // When a creator drops on the palette, remove the dragged node from the source it was dragged from.
    function handleDrop() {
        if ($project === undefined) return;

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

    $: {
        if (query === '') results = undefined;
        else {
            results = $index?.getQuery($preferredTranslations, query);
        }
    }
</script>

<!-- Drop what's being dragged if the window loses focus. -->
<svelte:window on:blur={() => dragged.set(undefined)} />

<section
    class="palette"
    on:mousedown={handleMouseDown}
    on:mouseup={handleDrop}
    bind:this={palette}
>
    <div class="header">
        <TextField placeholder={'🔍'} bind:text={query} />
        {#if currentConcept}
            <span class="path">
                <Button
                    tip={$preferredTranslations[0].ui.tooltip.home}
                    action={back}>◁</Button
                >
                {#each $path as concept, index}
                    {#if index > 0}&nbsp;&mdash;&nbsp;{/if}<DescriptionView
                        description={concept.getName($preferredTranslations[0])}
                    />
                {/each}
            </span>
        {/if}
    </div>
    <section
        class="content"
        tabIndex="0"
        on:keydown={(event) =>
            event.key === 'Escape' || event.key === 'Backspace'
                ? back()
                : undefined}
    >
        <!-- Search results are prioritized over a selected concept -->
        {#if results}
            {#each results as [concept, text]}
                <CodeView
                    {concept}
                    node={concept.getRepresentation()}
                    selectable
                />
                <!-- Show the matching text -->
                {#each text as [match, index]}
                    <p class="result"
                        >{match.substring(0, index)}<span class="match"
                            >{query}</span
                        >{match.substring(index + query.length)}</p
                    >
                {/each}
            {:else}
                <div class="empty">😞</div>
            {/each}
            <!-- A selected concept is prioritized over the home page -->
        {:else if currentConcept}
            {#if currentConcept instanceof StructureConcept}
                <StructureConceptView concept={currentConcept} />
            {:else if currentConcept instanceof FunctionConcept}
                <FunctionConceptView concept={currentConcept} />
            {:else if currentConcept instanceof BindConcept}
                <BindConceptView concept={currentConcept} />
            {:else if currentConcept instanceof ConversionConcept}
                <ConversionConceptView concept={currentConcept} />
            {:else if currentConcept instanceof StreamConcept}
                <StreamConceptView concept={currentConcept} />
            {:else if currentConcept instanceof NodeConcept}
                <NodeConceptView concept={currentConcept} />
            {:else}
                <CodeView
                    node={currentConcept.getRepresentation()}
                    concept={currentConcept}
                />
            {/if}
            <!-- Home page is default. -->
        {:else if $index}
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
</section>

<style>
    .palette {
        flex: 1;
        background-color: var(--wordplay-background);
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    :global(.animated) .palette {
        transition: width ease-out, visibility ease-out, opacity ease-out;
        transition-duration: 200ms;
    }

    .content {
        flex: 1;
        padding: calc(2 * var(--wordplay-spacing));
    }

    .content:focus {
        outline: none;
    }

    .header {
        top: 0;
        background-color: var(--wordplay-background);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .path {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        align-items: center;
    }

    .result {
        font-style: italic;
        margin-left: var(--wordplay-spacing);
    }

    .match {
        color: var(--wordplay-highlight);
    }

    .empty {
        font-size: calc(2 * var(--wordplay-font-size));
        text-align: center;
    }
</style>
