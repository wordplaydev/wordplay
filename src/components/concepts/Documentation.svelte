<script lang="ts">
    import {
        getDragged,
        getConceptIndex,
        getConceptPath,
    } from '../project/Contexts';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import Expression from '@nodes/Expression';
    import Button from '../widgets/Button.svelte';
    import Source from '@nodes/Source';
    import ConceptsView from './ConceptsView.svelte';
    import StructureConceptView from './StructureConceptView.svelte';
    import { onDestroy, setContext } from 'svelte';
    import StructureConcept from '@concepts/StructureConcept';
    import FunctionConcept from '@concepts/FunctionConcept';
    import BindConcept from '@concepts/BindConcept';
    import type Concept from '@concepts/Concept';
    import FunctionConceptView from './FunctionConceptView.svelte';
    import StreamConcept from '@concepts/StreamConcept';
    import CodeView from './CodeView.svelte';
    import ConversionConcept from '@concepts/ConversionConcept';
    import ConceptView from './ConceptView.svelte';
    import StreamConceptView from './StreamConceptView.svelte';
    import NodeConcept from '@concepts/NodeConcept';
    import type Node from '@nodes/Node';
    import NodeConceptView from './NodeConceptView.svelte';
    import Purpose from '@concepts/Purpose';
    import { tick } from 'svelte';
    import TextField from '../widgets/TextField.svelte';
    import type Project from '../../models/Project';
    import { Projects, locales } from '../../db/Database';
    import getScrollParent from '../util/getScrollParent';
    import Note from '../widgets/Note.svelte';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import TutorialHighlight from '../app/TutorialHighlight.svelte';
    import ConceptLink from '../../nodes/ConceptLink';

    export let project: Project;

    let view: HTMLElement | undefined;

    /**
     * The palette is hybrid documentation/drag and drop palette, organized by types.
     * Each type has a dedicated page that lists 1) language constructs associated with the type,
     * 2) functions on the type. It includes any creator-defined types and borrowed types in the active project.
     */

    let index = getConceptIndex();
    let path = getConceptPath();

    let dragged = getDragged();

    let query = '';
    let results: [Concept, [string, number, number][]][] | undefined =
        undefined;

    let currentConcept: Concept | undefined = undefined;
    $: currentConcept = $path[$path.length - 1];

    // Set a context that stores a project context for nodes in the palette to use.
    // Keep it up to date as the project changes.
    $: setContext('context', project.getContext(project.getMain()));

    async function scrollToTop() {
        // Wait for everything to render
        await tick();
        // Scroll to the top of the containing viewport.
        if (view) {
            const scroll = getScrollParent(view);
            if (scroll) scroll.scrollTop = 0;
        }
    }

    // When the path changes, reset the query
    const queryResetUnsub = path.subscribe(() => {
        query = '';
    });
    onDestroy(() => queryResetUnsub());

    // When the path changes to a non-bind concept, scroll to top.
    let previousPath: Concept[] = [];
    $: {
        if (
            previousPath.map((c) => c.getName($locales, false)).join() !==
            $path.map((c) => c.getName($locales, false)).join()
        )
            scrollToTop();
        previousPath = $path.slice();
    }

    // If the query changes to non-empty, compute results
    $: {
        if (query !== '') {
            results = $index?.getQuery($locales, query);
            // If there are results, sort them by priority
            if (results) {
                results = results.sort((a, b) => {
                    const [, aMatches] = a;
                    const [, bMatches] = b;
                    const aMinPriority = Math.min.apply(
                        null,
                        aMatches.map(([, , match]) => match),
                    );
                    const bMinPriority = Math.min.apply(
                        null,
                        bMatches.map(([, , match]) => match),
                    );
                    return aMinPriority - bMinPriority;
                });
            }
        } else results = undefined;
    }

    // Find all the highlights in the current documentation so we can render them.

    $: highlights =
        currentConcept === undefined
            ? undefined
            : currentConcept
                  .getDocs($locales)
                  ?.nodes()
                  .filter(
                      (n): n is ConceptLink =>
                          n instanceof ConceptLink &&
                          n.concept.getText().startsWith('@UI/'),
                  )
                  .map((concept) =>
                      concept.concept.getText().substring('@UI/'.length),
                  );

    // When a creator drops on the palette, remove the dragged node from the source it was dragged from.
    function handleDrop() {
        const node: Node | undefined = $dragged;

        // Release the dragged node.
        if (dragged) dragged.set(undefined);

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
            source.spaces.withReplacement(node, replacement),
        );

        // Update the project with the new source files
        Projects.reviseProject(
            project
                .withSource(source, newSource)
                .withCaret(newSource, source.getNodeFirstPosition(node) ?? 0),
        );
    }

    function back() {
        $path.pop();
        path.set([...$path]);
    }

    function home() {
        path.set([]);
    }
</script>

<!-- Drop what's being dragged if the window loses focus. -->
<svelte:window on:blur={() => dragged?.set(undefined)} />

<div class="header">
    <TextField
        placeholder={'🔍'}
        description={$locales.get((l) => l.ui.docs.field.search)}
        bind:text={query}
        fill
    />
    {#if currentConcept}
        <span class="path">
            {#if $path.length > 1}
                <Button
                    tip={$locales.get((l) => l.ui.docs.button.home)}
                    action={home}>⇤</Button
                >{/if}
            <Button
                tip={$locales.get((l) => l.ui.docs.button.back)}
                action={back}>←</Button
            >
            {#each $path as concept, index}{#if index > 0}
                    ·
                {/if}{#if index === $path.length - 1}<ConceptLinkUI
                        link={concept}
                        symbolic={false}
                    />{/if}
            {/each}
        </span>
    {/if}
</div>
<section
    class="palette"
    aria-label={$locales.get((l) => l.ui.docs.label)}
    on:pointerup={handleDrop}
    bind:this={view}
>
    <div class="content">
        <!-- Search results are prioritized over a selected concept -->
        {#if results}
            {#each results as [concept, text]}
                <p class="result">
                    <CodeView {concept} node={concept.getRepresentation()} />
                    <!-- Show the matching text -->
                    {#if text.length > 1 || concept.getName($locales, false) !== text[0][0]}
                        <div class="matches">
                            {#each text as [match, index]}
                                <Note
                                    >{match.substring(0, index)}<span
                                        class="match"
                                        >{match.substring(
                                            index,
                                            index + query.length,
                                        )}</span
                                    >{match.substring(
                                        index + query.length,
                                    )}</Note
                                >
                            {/each}
                        </div>
                    {/if}
                </p>
            {:else}
                <div class="empty">😞</div>
            {/each}
            <!-- A selected concept is prioritized over the home page -->
        {:else if currentConcept}
            {#if currentConcept instanceof StructureConcept}
                <StructureConceptView concept={currentConcept} />
            {:else if currentConcept instanceof FunctionConcept}
                <FunctionConceptView concept={currentConcept} />
                <!-- If it's a bind, don't show a bind view, show the concept that owns the bind, and ask it to scroll to it -->
            {:else if currentConcept instanceof BindConcept}
                {@const owner = $index?.getConceptOwner(currentConcept)}
                {#if owner instanceof FunctionConcept}
                    <FunctionConceptView
                        concept={owner}
                        subconcept={currentConcept}
                    />
                {:else if owner instanceof StructureConcept}
                    <StructureConceptView
                        concept={owner}
                        subconcept={currentConcept}
                    />
                {:else if owner instanceof StreamConcept}
                    <StreamConceptView
                        concept={owner}
                        subconcept={currentConcept}
                    />
                {/if}
            {:else if currentConcept instanceof ConversionConcept}
                <ConceptView concept={currentConcept} />
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
                category={$locales.get((l) => l.term.project)}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Project)}
            />
            <ConceptsView
                category={$locales.get((l) => l.term.value)}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Value)}
            />
            <ConceptsView
                category={$locales.get((l) => l.term.evaluate)}
                concepts={$index.getPrimaryConceptsWithPurpose(
                    Purpose.Evaluate,
                )}
            />
            <ConceptsView
                category={$locales.get((l) => l.term.bind)}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Bind)}
            />
            <ConceptsView
                category={$locales.get((l) => l.term.decide)}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Decide)}
            />
            <ConceptsView
                category={$locales.get((l) => l.term.input)}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Input)}
            />
            <ConceptsView
                category={$locales.get((l) => l.term.output)}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Output)}
            />
            <ConceptsView
                category={$locales.get((l) => l.term.type)}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Type)}
            />
            <ConceptsView
                category={$locales.get((l) => l.term.document)}
                concepts={$index.getPrimaryConceptsWithPurpose(
                    Purpose.Document,
                )}
            />
            <ConceptsView
                category={$locales.get((l) => l.term.source)}
                concepts={$index.getPrimaryConceptsWithPurpose(Purpose.Source)}
            />
        {/if}
    </div>
    {#key highlights}
        {#each highlights ?? [] as highlight}
            <TutorialHighlight id={highlight} />
        {/each}
    {/key}
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
        transition:
            width ease-out,
            visibility ease-out,
            opacity ease-out;
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
        background-color: var(--wordplay-background);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        padding-top: 0;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        position: sticky;
        top: 0;
        z-index: 1;
        margin-left: calc(var(--wordplay-spacing) / 2);
        margin-right: calc(var(--wordplay-spacing) / 2);
    }

    .path {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        overflow-x: scroll;
        font-size: var(--wordplay-small-font-size);
        gap: var(--wordplay-spacing);
        padding-left: var(--wordplay-spacing);
        align-items: center;
    }

    .result {
        margin-top: var(--wordplay-spacing);
    }

    .matches {
        margin-left: var(--wordplay-spacing);
    }
    .match {
        color: var(--wordplay-highlight-color);
    }

    .empty {
        font-size: calc(2 * var(--wordplay-font-size));
        text-align: center;
    }
</style>
