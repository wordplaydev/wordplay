<script lang="ts">
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import BindConcept from '@concepts/BindConcept';
    import type Concept from '@concepts/Concept';
    import ConversionConcept from '@concepts/ConversionConcept';
    import FunctionConcept from '@concepts/FunctionConcept';
    import HowConcept from '@concepts/HowConcept';
    import type HowTo from '@concepts/HowTo';
    import { HowToCategories, type HowToCategory } from '@concepts/HowTo';
    import NodeConcept from '@concepts/NodeConcept';
    import Purpose from '@concepts/Purpose';
    import StreamConcept from '@concepts/StreamConcept';
    import StructureConcept from '@concepts/StructureConcept';
    import Expression from '@nodes/Expression';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import type Node from '@nodes/Node';
    import Source from '@nodes/Source';
    import { onDestroy, tick } from 'svelte';
    import { Locales, Projects, locales } from '../../db/Database';
    import type Project from '../../db/projects/Project';
    import ConceptLink from '../../nodes/ConceptLink';
    import TutorialHighlight from '../app/TutorialHighlight.svelte';
    import {
        getConceptIndex,
        getConceptPath,
        getDragged,
        type ConceptPath,
    } from '../project/Contexts';
    import getScrollParent from '../util/getScrollParent';
    import Button from '../widgets/Button.svelte';
    import Note from '../widgets/Note.svelte';
    import TextField from '../widgets/TextField.svelte';
    import CodeView from './CodeView.svelte';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import ConceptsView from './ConceptsView.svelte';
    import ConceptView from './ConceptView.svelte';
    import FunctionConceptView from './FunctionConceptView.svelte';
    import HowConceptView from './HowConceptView.svelte';
    import NodeConceptView from './NodeConceptView.svelte';
    import StreamConceptView from './StreamConceptView.svelte';
    import StructureConceptView from './StructureConceptView.svelte';

    interface Props {
        project: Project;
        collapse?: boolean;
    }

    let { project, collapse = true }: Props = $props();

    let view: HTMLElement | undefined = $state();

    /**
     * The palette is hybrid documentation/drag and drop palette, organized by types.
     * Each type has a dedicated page that lists 1) language constructs associated with the type,
     * 2) functions on the type. It includes any creator-defined types and borrowed types in the active project.
     */

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    let path = getConceptPath();

    let dragged = getDragged();

    /** The current search string */
    let query = $state('');

    /** The browsing mode (programming language or how to) */
    let mode = $state<'language' | 'how'>('how');

    /** The current concept is always the one at the end of the list. */
    let currentConcept = $derived($path[$path.length - 1]);

    async function scrollToTop() {
        // Wait for everything to render
        await tick();
        // Scroll to the top of the containing viewport.
        if (view) {
            const scroll = getScrollParent(view);
            if (scroll) scroll.scrollTop = 0;
        }
    }

    // Keep a cache of the how tos for the current language.
    let howTos = $state<HowTo[] | undefined>(undefined);
    $effect(() => {
        if (howTos === undefined)
            Locales.loadHowTos($locales.getLocaleString()).then((loaded) => {
                howTos = loaded;
            });
    });

    // When the path changes, reset the query
    const queryResetUnsub = path.subscribe(() => {
        query = '';
    });
    onDestroy(() => queryResetUnsub());

    /** Remember the previous path we visited */
    let previousPath: ConceptPath = $state([]);

    /** When the path changes to a different concept, scroll to top. */
    $effect(() => {
        if (
            previousPath.map((c) => c.getName($locales, false)).join() !==
            $path.map((c) => c.getName($locales, false)).join()
        ) {
            scrollToTop();
            previousPath = $path.slice();
        }
    });

    // If the query changes to non-empty, compute matches
    let results: [Concept, [string, number, number]][] | undefined = $derived(
        query.length > 1
            ? index?.getQuery($locales, query)?.sort((a, b) => {
                  const [, aMatches] = a;
                  const [, bMatches] = b;
                  return aMatches[2] - bMatches[2];
              })
            : undefined,
    );

    // Find all the highlights in the current documentation so we can render them.
    let highlights = $derived(
        currentConcept === undefined
            ? undefined
            : currentConcept
                  .getDocs($locales)[0]
                  ?.nodes()
                  .filter(
                      (n): n is ConceptLink =>
                          n instanceof ConceptLink &&
                          n.concept.getText().startsWith('@UI/'),
                  )
                  .map((concept) =>
                      concept.concept.getText().substring('@UI/'.length),
                  ),
    );

    // When a creator drops on the palette, remove the dragged node from the source it was dragged from.
    function handleDrop() {
        // No project? No drop.
        if (project === undefined) return;

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
<svelte:window onblur={() => dragged?.set(undefined)} />

<div class="header">
    <TextField
        id="concept-search"
        placeholder={'🔍'}
        description={(l) => l.ui.docs.field.search}
        bind:text={query}
        fill
    />
    <Mode
        descriptions={(l) => l.ui.docs.modes}
        choice={mode === 'how' ? 0 : 1}
        select={(choice) => {
            const newMode = choice === 0 ? 'how' : 'language';
            if (mode !== newMode) {
                mode = newMode;
                path.set([]);
            }
        }}
        modes={[
            $locales.get((l) => l.ui.docs.modes.modes[0]),
            $locales.get((l) => l.ui.docs.modes.modes[1]),
        ]}
    />

    {#if currentConcept}
        <span class="path">
            {#if $path.length > 1}
                <Button
                    tip={(l) => l.ui.docs.button.home}
                    icon="⇤"
                    action={home}
                ></Button>{/if}
            <Button tip={(l) => l.ui.docs.button.back} icon="←" action={back}
            ></Button>
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
    class="documentation"
    data-testid="documentation"
    aria-label={$locales.get((l) => l.ui.docs.label)}
    onpointerup={handleDrop}
    bind:this={view}
>
    <div class="content">
        <!-- Search results are prioritized over a selected concept -->
        {#if results}
            {#each results as [concept, text]}
                <div class="result">
                    <CodeView {concept} node={concept.getRepresentation()} />
                    <!-- Show the matching text -->
                    {#if text.length > 1 || concept.getName($locales, false) !== text[0]}
                        {@const match = text[0]}
                        {@const index = text[1]}
                        <div class="matches">
                            <Note
                                >{match.substring(0, index)}<span class="match"
                                    >{match.substring(
                                        index,
                                        index + query.length,
                                    )}</span
                                >{match.substring(index + query.length)}</Note
                            >
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="empty">😞</div>
            {/each}
        {:else}
            <!-- A selected concept is prioritized over the home page -->
            {#if currentConcept}
                {#if currentConcept instanceof StructureConcept}
                    <StructureConceptView concept={currentConcept} />
                {:else if currentConcept instanceof FunctionConcept}
                    <FunctionConceptView concept={currentConcept} />
                    <!-- If it's a bind, don't show a bind view, show the concept that owns the bind, and ask it to scroll to it -->
                {:else if currentConcept instanceof BindConcept}
                    {@const owner = index?.getConceptOwner(currentConcept)}
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
                {:else if currentConcept instanceof HowConcept}
                    <HowConceptView concept={currentConcept} />
                {:else}
                    <CodeView
                        node={currentConcept.getRepresentation()}
                        concept={currentConcept}
                    />
                {/if}
                <!-- Home page is default. -->
            {:else if index}
                {#if mode === 'how'}
                    {#if howTos === undefined}
                        <Spinning></Spinning>
                    {:else}
                        {@const how = index.concepts.filter(
                            (c) => c instanceof HowConcept,
                        )}
                        {#each Object.keys(HowToCategories) as category}
                            {@const categoryHowTos = how.filter(
                                (howTo) => howTo.how.category === category,
                            )}
                            {#if categoryHowTos.length > 0}
                                <Subheader
                                    text={(l) =>
                                        l.ui.docs.how.category[
                                            category as HowToCategory
                                        ]}
                                />
                                <div class="howtos">
                                    {#each categoryHowTos as how}
                                        <CodeView
                                            node={how.getRepresentation()}
                                            concept={how}
                                            elide
                                            flip
                                        />
                                    {/each}
                                </div>
                            {/if}
                        {/each}
                    {/if}
                {:else}
                    {@const projectConcepts =
                        index.getPrimaryConceptsWithPurpose(Purpose.Project)}
                    {#if projectConcepts.length > 0}
                        <ConceptsView
                            category={(l) => l.term.project}
                            concepts={projectConcepts}
                            {collapse}
                        />
                    {/if}
                    <ConceptsView
                        category={(l) => l.term.value}
                        concepts={index.getPrimaryConceptsWithPurpose(
                            Purpose.Value,
                        )}
                        {collapse}
                    />
                    <ConceptsView
                        category={(l) => l.term.evaluate}
                        concepts={index.getPrimaryConceptsWithPurpose(
                            Purpose.Evaluate,
                        )}
                        {collapse}
                    />
                    <ConceptsView
                        category={(l) => l.term.bind}
                        concepts={index.getPrimaryConceptsWithPurpose(
                            Purpose.Bind,
                        )}
                        {collapse}
                    />
                    <ConceptsView
                        category={(l) => l.term.decide}
                        concepts={index.getPrimaryConceptsWithPurpose(
                            Purpose.Decide,
                        )}
                        {collapse}
                    />
                    <ConceptsView
                        category={(l) => l.term.input}
                        concepts={index.getPrimaryConceptsWithPurpose(
                            Purpose.Input,
                        )}
                        {collapse}
                    />
                    <ConceptsView
                        category={(l) => l.term.output}
                        concepts={index.getPrimaryConceptsWithPurpose(
                            Purpose.Output,
                        )}
                        {collapse}
                    />
                    <ConceptsView
                        category={(l) => l.term.type}
                        concepts={index.getPrimaryConceptsWithPurpose(
                            Purpose.Type,
                        )}
                        {collapse}
                    />
                    <ConceptsView
                        category={(l) => l.term.document}
                        concepts={index.getPrimaryConceptsWithPurpose(
                            Purpose.Document,
                        )}
                        {collapse}
                    />
                    <ConceptsView
                        category={(l) => l.term.source}
                        concepts={index.getPrimaryConceptsWithPurpose(
                            Purpose.Source,
                        )}
                        {collapse}
                    />
                {/if}
            {:else}
                No index.
            {/if}
        {/if}
    </div>
    {#key highlights}
        {#each highlights ?? [] as highlight}
            <TutorialHighlight id={highlight} />
        {/each}
    {/key}
</section>

<style>
    .documentation {
        flex: 1;
        background-color: var(--wordplay-background);
        display: flex;
        flex-direction: column;
        height: 100%;
        transition:
            width ease-out,
            visibility ease-out,
            opacity ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .content {
        flex: 1;
        padding: calc(2 * var(--wordplay-spacing));
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
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

    .howtos {
        display: flex;
        flex-direction: column;
        gap: 1em;
    }
</style>
