<script module lang="ts">
    /** The available documentation browsing modes */
    export const Modes = ['language', 'howto'] as const;
</script>

<script lang="ts">
    import HeaderAndExplanation from '@components/app/HeaderAndExplanation.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
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
    import {
        getLanguageQuoteClose,
        getLanguageQuoteOpen,
    } from '@locale/LanguageCode';
    import Expression from '@nodes/Expression';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import type Node from '@nodes/Node';
    import Source from '@nodes/Source';
    import {
        BIND_SYMBOL,
        DOCUMENTATION_SYMBOL,
        FORMATTED_SYMBOL,
        IDEA_SYMBOL,
        LIST_CLOSE_SYMBOL,
        LIST_OPEN_SYMBOL,
        MEASUREMENT_SYMBOL,
        NONE_SYMBOL,
        SEARCH_SYMBOL,
        SET_CLOSE_SYMBOL,
        SET_OPEN_SYMBOL,
        TABLE_CLOSE_SYMBOL,
        TABLE_OPEN_SYMBOL,
        TRUE_SYMBOL,
        TYPE_SYMBOL,
    } from '@parser/Symbols';
    import { onDestroy, tick } from 'svelte';
    import { Locales, Projects, blocks, locales } from '../../db/Database';
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
    import ConceptGroupView from './ConceptGroupView.svelte';
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
        standalone: boolean;
        collapse?: boolean;
    }

    let { project, standalone, collapse = false }: Props = $props();

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
    let mode = $state<(typeof Modes)[number]>($blocks ? 'language' : 'howto');

    /** The purpose selected for browsing */
    let purpose = $state<Purpose>(Purpose.Outputs);

    /** The current concept is always the one at the end of the list. */
    let currentConcept = $derived($path[$path.length - 1]);

    let viewWidth: number = $state(0);
    let viewHeight: number = $state(0);
    let row = $derived(viewWidth > viewHeight);

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

    // If blocks mode is on, switch language mode.
    $effect(() => {
        if ($blocks) {
            mode = 'language';
        }
    });
</script>

<!-- Drop what's being dragged if the window loses focus. -->
<svelte:window onblur={() => dragged?.set(undefined)} />

<div class="header">
    <TextField
        id="concept-search"
        placeholder={SEARCH_SYMBOL}
        description={(l) => l.ui.docs.field.search}
        bind:text={query}
        fill
    />
    {#if query.length === 0}
        <Mode
            modes={(l) => l.ui.docs.mode.browse}
            icons={[DOCUMENTATION_SYMBOL, IDEA_SYMBOL]}
            choice={Modes.indexOf(mode)}
            select={(choice) => {
                const newMode = Modes[choice];
                if (mode !== newMode) {
                    mode = newMode;
                    path.set([]);
                }
            }}
        />
        {#if mode === 'language'}
            <Mode
                modes={(l) => l.ui.docs.mode.purpose}
                choice={Object.keys(Purpose).indexOf(purpose)}
                select={(choice) => {
                    purpose = Object.values(Purpose)[choice];
                    path.set([]);
                }}
                icons={[
                    '👤',
                    '🖥️',
                    '🖱️',
                    '?',
                    BIND_SYMBOL,
                    getLanguageQuoteOpen($locales.getLocale().language) +
                        getLanguageQuoteClose($locales.getLocale().language),
                    MEASUREMENT_SYMBOL,
                    TRUE_SYMBOL + NONE_SYMBOL,
                    LIST_OPEN_SYMBOL + LIST_CLOSE_SYMBOL,
                    SET_OPEN_SYMBOL + SET_CLOSE_SYMBOL,
                    TABLE_OPEN_SYMBOL + TABLE_CLOSE_SYMBOL,
                    FORMATTED_SYMBOL + FORMATTED_SYMBOL,
                    TYPE_SYMBOL,
                    '',
                ]}
                wrap
                omit={standalone ? [0] : []}
            />
        {/if}
    {/if}

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
    bind:clientWidth={viewWidth}
    bind:clientHeight={viewHeight}
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
                {#if mode === 'howto'}
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
                {:else if purpose === Purpose.Project}
                    {@const projectConcepts =
                        index.getPrimaryConceptsWithPurpose(Purpose.Project)}
                    {#if projectConcepts.length > 0}
                        <ConceptsView
                            category={(l) => l.term.project}
                            concepts={projectConcepts}
                            {collapse}
                            row={viewWidth > viewHeight}
                        />
                    {:else}
                        <Note
                            ><LocalizedText
                                path={(l) => l.ui.docs.note.empty}
                            /></Note
                        >
                    {/if}
                {:else if purpose === Purpose.Outputs}
                    {@const concepts =
                        index.getPrimaryConceptsWithPurpose(purpose)}
                    {@const sourceConcept = index.getStructureConcept(
                        project.shares.output.Data,
                    )}
                    {@const outputs: Concept[] = [...index.getInterfaceImplementers(
                        project.shares.output.Output,
                    ), ...(sourceConcept ? [ sourceConcept] : [])]}
                    {@const arrangements: Concept[] = index.getInterfaceImplementers(
                        project.shares.output.Arrangement,
                    )}
                    {@const forms: Concept[] = index.getInterfaceImplementers(
                        project.shares.output.Form,
                    )}
                    {@const styles: Concept[] = concepts.filter(
                        (c) => c instanceof FunctionConcept || (c instanceof StructureConcept && c.definition === project.shares.output.Sequence)
                    )}
                    {@const appearance: Concept[] = concepts.filter((c) => c instanceof StructureConcept && (c.definition === project.shares.output.Color || c.definition === project.shares.output.Aura || c.definition === project.shares.output.Pose))}
                    {@const other: Concept[] = concepts.filter(
                        (c) =>
                            !outputs.includes(c) &&
                            !arrangements.includes(c) &&
                            !forms.includes(c) &&
                            !styles.includes(c) &&
                            !appearance.includes(c) && !((c instanceof StructureConcept) && (c.definition === project.shares.output.Form || c.definition === project.shares.output.Arrangement))

                    )}
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.purposes.Outputs}
                        sub
                    />
                    <ConceptGroupView concepts={outputs} {collapse} {row} />
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.header.arrangements}
                        sub
                    />
                    <ConceptGroupView
                        concepts={arrangements}
                        {collapse}
                        {row}
                    />
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.header.forms}
                        sub
                    />
                    <ConceptGroupView concepts={forms} {collapse} {row} />
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.header.appearance}
                        sub
                    />
                    <ConceptGroupView concepts={appearance} {collapse} {row} />
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.header.appearance}
                        sub
                    />
                    <ConceptGroupView concepts={styles} {collapse} {row} />
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.header.location}
                        sub
                    />
                    <ConceptGroupView concepts={other} {collapse} {row} />
                {:else if purpose === Purpose.Inputs}
                    {@const concepts =
                        index.getPrimaryConceptsWithPurpose(purpose)}
                    {@const controls: Concept[] = concepts.filter(
                        (c) => c instanceof NodeConcept,
                    )}
                    {@const streams = concepts.filter(
                        (c) => !controls.includes(c),
                    )}
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.purposes.Inputs}
                        sub
                    />
                    <ConceptGroupView concepts={streams} {collapse} {row} />
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.header.reactions}
                        sub
                    />
                    <ConceptGroupView concepts={controls} {collapse} {row} />
                {:else if [Purpose.Text, Purpose.Numbers, Purpose.Truth, Purpose.Lists, Purpose.Maps, Purpose.Tables].includes(purpose)}
                    {@const primary =
                        index.getPrimaryConceptsWithPurpose(purpose)}
                    {@const functions = primary
                        .map((p) =>
                            Array.from(p.getSubConcepts()).filter(
                                (c) => c instanceof FunctionConcept,
                            ),
                        )
                        .flat()}
                    {@const conversions = primary
                        .map((p) =>
                            Array.from(p.getSubConcepts()).filter(
                                (c) => c instanceof ConversionConcept,
                            ),
                        )
                        .flat()}
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.purposes[purpose]}
                        sub
                    />
                    <ConceptGroupView
                        concepts={[...primary]}
                        {collapse}
                        {row}
                    />
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.header.functions}
                        sub
                    />
                    <ConceptGroupView concepts={functions} {collapse} {row} />
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.header.conversions}
                        sub
                    />
                    <ConceptGroupView concepts={conversions} {collapse} {row} />
                {:else}
                    <HeaderAndExplanation
                        text={(l) => l.ui.docs.purposes[purpose]}
                        sub
                    />
                    <ConceptGroupView
                        concepts={index.getPrimaryConceptsWithPurpose(purpose)}
                        {collapse}
                        row={viewWidth > viewHeight}
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
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        position: sticky;
        top: 0;
        z-index: 1;
        margin-left: var(--wordplay-spacing-half);
        margin-right: var(--wordplay-spacing-half);
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
