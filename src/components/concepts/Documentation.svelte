<script lang="ts">
    import {
        getDragged,
        getConceptIndex,
        getConceptPath,
        getProjects,
    } from '../project/Contexts';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import Expression from '@nodes/Expression';
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
    import type Project from '../../models/Project';

    export let project: Project;

    let palette: HTMLElement | undefined;

    let projects = getProjects();

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
    $: setContext('context', project.getContext(project.main));

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

        // Find code views
        const code = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest('.code');

        // Find non-inert roots inside
        const roots = code?.querySelectorAll('.root:not(.inert) .node-view');

        if (roots) {
            for (const root of roots) {
                if (root instanceof HTMLElement) {
                    let node: Node | undefined = $index?.getNode(
                        parseInt(root.dataset.id ?? '')
                    );
                    if (node !== undefined) {
                        // Set the dragged node to a deep clone of the (it may contain nodes from declarations that we don't want leaking into the program);
                        dragged.set(node.clone());
                        break;
                    }
                }
            }
        }
    }

    // When a creator drops on the palette, remove the dragged node from the source it was dragged from.
    function handleDrop() {
        const node: Node | undefined = $dragged;

        // Release the dragged node.
        dragged.set(undefined);

        // No node released? We're done.
        if (node === undefined) return;

        // See if we can remove the node from it's root.
        const source = project.getRoot(node)?.root;
        if (source === undefined || !(source instanceof Source)) return;

        // Figure out what to replace the dragged node with. By default, we remove it.
        const type =
            node instanceof Expression
                ? node.getType(project.getContext(source))
                : undefined;
        let replacement =
            node instanceof Expression && !source.root.inList(node)
                ? ExpressionPlaceholder.make(type)
                : undefined;

        const newSource = source.withProgram(
            source.expression.replace(node, replacement),
            source.spaces.withReplacement(node, replacement)
        );

        // Update the project with the new source files
        $projects.revise(
            project,
            project
                .withSource(source, newSource)
                .withCaret(newSource, source.getNodeFirstPosition(node) ?? 0)
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
    aria-label={$preferredTranslations[0].ui.section.palette}
    on:mousedown={handleMouseDown}
    on:mouseup={handleDrop}
    on:keydown={(event) => (event.key === 'Backspace' ? back() : undefined)}
    bind:this={palette}
>
    <div class="header">
        <TextField placeholder={'🔍'} bind:text={query} fill defaultFocus />
        {#if currentConcept}
            <span class="path">
                <Button
                    tip={$preferredTranslations[0].ui.tooltip.home}
                    action={back}>⏴</Button
                >
                {#each $path as concept, index}
                    {#if index > 0}&nbsp;&mdash;&nbsp;{/if}<DescriptionView
                        description={concept.getName($preferredTranslations[0])}
                    />
                {/each}
            </span>
        {/if}
    </div>
    <div class="content">
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
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Project)}
            />
            <ConceptsView
                category={$preferredTranslations[0].terminology.code}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Compute)}
                selectable={true}
            />
            <ConceptsView
                category={$preferredTranslations[0].terminology.store}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Store)}
            />
            <ConceptsView
                category={$preferredTranslations[0].terminology.decide}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Decide)}
                selectable={true}
            />
            <ConceptsView
                category={$preferredTranslations[0].terminology.input}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Input)}
            />
            <ConceptsView
                category={$preferredTranslations[0].terminology.output}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Output)}
            />
        {/if}
    </div>
</section>

<style>
    .palette {
        flex: 1;
        background-color: var(--wordplay-background);
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .palette {
        transition: width ease-out, visibility ease-out, opacity ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
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
    }

    .match {
        color: var(--wordplay-highlight);
    }

    .empty {
        font-size: calc(2 * var(--wordplay-font-size));
        text-align: center;
    }
</style>
