<script module lang="ts">
    /** The available documentation browsing modes */
    export const Modes = ['language', 'howto'] as const;
</script>

<script lang="ts">
    import HeaderAndExplanation from '@components/app/HeaderAndExplanation.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import TutorialHighlight from '@components/app/TutorialHighlight.svelte';
    import CodeView from '@components/concepts/CodeView.svelte';
    import ConceptGroupView from '@components/concepts/ConceptGroupView.svelte';
    import ConceptLinkUI from '@components/concepts/ConceptLinkUI.svelte';
    import ConceptsView from '@components/concepts/ConceptsView.svelte';
    import ConceptView from '@components/concepts/ConceptView.svelte';
    import { summarizeUnionTypes } from '@components/concepts/elideNode';
    import FunctionConceptView from '@components/concepts/FunctionConceptView.svelte';
    import HowConceptView from '@components/concepts/HowConceptView.svelte';
    import NodeConceptView from '@components/concepts/NodeConceptView.svelte';
    import StreamConceptView from '@components/concepts/StreamConceptView.svelte';
    import StructureConceptView from '@components/concepts/StructureConceptView.svelte';
    import {
        getConceptIndex,
        getConceptPath,
        getDragged,
        getUser,
        type ConceptPath,
    } from '@components/project/Contexts';
    import getScrollParent from '@components/util/getScrollParent';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import BindConcept from '@concepts/BindConcept';
    import type Concept from '@concepts/Concept';
    import ConversionConcept from '@concepts/ConversionConcept';
    import FunctionConcept from '@concepts/FunctionConcept';
    import GalleryHowConcept from '@concepts/GalleryHowConcept';
    import HowConcept from '@concepts/HowConcept';
    import type HowTo from '@concepts/HowTo';
    import { HowToCategories, type HowToCategory } from '@concepts/HowTo';
    import NodeConcept from '@concepts/NodeConcept';
    import { Purpose, type PurposeType } from '@concepts/Purpose';
    import StreamConcept from '@concepts/StreamConcept';
    import StructureConcept from '@concepts/StructureConcept';
    import {
        Galleries,
        HowTos,
        Locales,
        Projects,
        blocks,
        locales,
    } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import GalleryHowTo from '@db/howtos/HowToDatabase.svelte';
    import type Project from '@db/projects/Project';
    import {
        getLanguageQuoteClose,
        getLanguageQuoteOpen,
    } from '@locale/LanguageCode';
    import CompositeLiteral from '@nodes/CompositeLiteral';
    import ConceptLink from '@nodes/ConceptLink';
    import Expression from '@nodes/Expression';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import Literal from '@nodes/Literal';
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
    import { debounced } from '@util/debounce.svelte';
    import { onDestroy, tick } from 'svelte';
    import HowToConceptView from './HowToConceptView.svelte';

    interface Props {
        project: Project;
        standalone: boolean;
        collapse?: boolean;
        /** Two-way bound search query. The standalone guide binds this to sync it
         *  to the URL; embedded uses leave it unbound (it's local state). */
        query?: string;
        /** Two-way bound browsing location, bound by hosts that persist it to the
         *  URL: the section (code vs how-to), the code section's concept type, and
         *  the how-to filter. Unbound uses keep them as local state. */
        mode?: (typeof Modes)[number];
        purpose?: PurposeType;
        galleryOnly?: boolean;
    }

    let {
        project,
        standalone,
        collapse = false,
        query = $bindable(''),
        mode = $bindable($blocks ? 'language' : 'howto'),
        purpose = $bindable(Purpose.Outputs),
        galleryOnly = $bindable(false),
    }: Props = $props();

    let view: HTMLElement | undefined = $state();

    const contentPurposes = [
        Purpose.Text,
        Purpose.Numbers,
        Purpose.Truth,
        Purpose.Lists,
        Purpose.Maps,
        Purpose.Tables,
    ] as const;

    type ContentPurpose = (typeof contentPurposes)[number];

    function isContentPurpose(p: PurposeType): p is ContentPurpose {
        return (contentPurposes as readonly PurposeType[]).includes(p);
    }

    const user = getUser();

    /**
     * The palette is hybrid documentation/drag and drop palette, organized by types.
     * Each type has a dedicated page that lists 1) language constructs associated with the type,
     * 2) functions on the type. It includes any creator-defined types and borrowed types in the active project.
     */

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    let path = getConceptPath();
    let dragged = getDragged();

    /** A debounced copy of {@link query} that the search runs against, so fast
     *  typing doesn't trigger a full search on every keystroke. */
    const debouncedQuery = debounced(() => query);

    /** Fewest characters that actually run a search; shorter queries show a
     *  "keep typing" prompt instead. */
    const MIN_QUERY_LENGTH = 3;

    /** True once the user has typed anything: we enter search-results mode (and
     *  hide the browsing controls) even before the query is long enough to run. */
    let searchActive = $derived(query.trim().length > 0);

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

    /** How many search results to render per page. Results are lazily revealed
     *  as the user scrolls so a large result set doesn't cause rendering lag. */
    const RESULTS_PAGE = 25;
    let resultLimit = $state(RESULTS_PAGE);
    /** Sentinel at the end of the rendered results; when it scrolls into view we
     *  reveal another page. */
    let resultsSentinel = $state<HTMLElement>();

    // Reset the visible window whenever the result set changes (a new query).
    $effect(() => {
        void results;
        resultLimit = RESULTS_PAGE;
    });

    // Reveal more results as the sentinel approaches the viewport.
    $effect(() => {
        const sentinel = resultsSentinel;
        // Guard on `instanceof HTMLElement`, not `=== undefined`: Svelte sets a
        // `bind:this` to null (not undefined) when its element unmounts, which can
        // happen mid-layout in the embedded guide. getScrollParent/observe would
        // then throw "parameter 1 is not of type 'Element'".
        if (
            !(sentinel instanceof HTMLElement) ||
            !(view instanceof HTMLElement) ||
            results === undefined
        )
            return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries.some((e) => e.isIntersecting) &&
                    results !== undefined &&
                    resultLimit < results.length
                )
                    resultLimit = Math.min(
                        resultLimit + RESULTS_PAGE,
                        results.length,
                    );
            },
            { root: getScrollParent(view) ?? null, rootMargin: '400px' },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    });

    // Keep a cache of the how tos for the current language.
    let howTos = $state<HowTo[] | undefined>(undefined);
    $effect(() => {
        if (howTos === undefined)
            Locales.loadHowTos($locales.getLocaleString()).then((loaded) => {
                howTos = loaded;
            });
    });

    // get the user generated how-tos that are in a gallery, if the gallery exists
    // `galleryOnly` (whether to show only the project gallery's how-tos) is a
    // bound prop so hosts can restore it from the URL; the toggle only appears in
    // the embedded guide with a gallery, so unbound (standalone) uses keep false.

    let galleryID: string | null = $derived(project.getGallery());
    let gallery: Gallery | undefined = $state(undefined);
    let galleryHowTos: GalleryHowTo[] = $state([]);
    $effect(() => {
        if (galleryID) {
            Galleries.get(galleryID).then((gal) => {
                // Found a store? Subscribe to it, updating the gallery when it changes.
                if (gal) gallery = gal;
                // Not found? No gallery.
                else gallery = undefined;
            });
        }
    });

    $effect(() => {
        if (gallery) {
            HowTos.getHowTos(gallery.getHowTos()).then(
                (hts: GalleryHowTo[] | undefined | false) => {
                    if (hts) {
                        galleryHowTos = hts;
                        galleryHowTos = galleryHowTos.filter((ht) =>
                            ht.isPublished(),
                        );
                    }
                },
            );
        }
    });

    let allBookmarks: GalleryHowTo[] = $derived(
        HowTos.allAccessiblePublishedHowTos.filter((ht) =>
            ht.hasBookmarker($user?.uid ?? ''),
        ),
    );

    // order of how-tos shown in the Guide panel
    // 1: all bookmarked how-tos first
    // 2: then how-tos from the gallery that the project is in, if applicable (must be in project view and project must be in gallery)
    // 3: then all other how-tos, if applicable (if filter is set to all, project is not in gallery, or )
    let galleryHowConcepts: GalleryHowConcept[] = $derived(
        index
            ? (galleryID && galleryOnly
                  ? [...galleryHowTos, ...allBookmarks]
                  : HowTos.allAccessiblePublishedHowTos
              )
                  .map((ht) => index.getGalleryHowConcept(ht.getHowToId()))
                  .filter((c): c is GalleryHowConcept => c !== undefined)
                  .toSorted((a, b) => {
                      let aBookmarked = a.howTo.hasBookmarker($user?.uid ?? '');
                      let bBookmarked = b.howTo.hasBookmarker($user?.uid ?? '');

                      if (aBookmarked && !bBookmarked) {
                          return -1;
                      } else if (!aBookmarked && bBookmarked) {
                          return 1;
                      } else if (galleryID) {
                          let aInGallery =
                              a.howTo.getHowToGalleryId() === galleryID;
                          let bInGallery =
                              b.howTo.getHowToGalleryId() === galleryID;

                          if (aInGallery && !bInGallery) {
                              return -1;
                          } else if (!aInGallery && bInGallery) {
                              return 1;
                          } else {
                              return 0;
                          }
                      } else {
                          return 0;
                      }
                  })
            : [],
    );

    // When navigating *to* a concept, clear the search. (Guarding on a non-empty
    // path avoids wiping a query restored from the URL: the store's initial
    // emission and the empty-path set on load both have length 0.)
    const queryResetUnsub = path.subscribe((p) => {
        if (p.length > 0) query = '';
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

    // If the query changes to non-empty, compute matches. getQuery already
    // returns results ordered name-matches-first, then by match quality.
    let results: [Concept, [string, number, number, number]][] | undefined =
        $derived(
            debouncedQuery.current.trim().length >= MIN_QUERY_LENGTH
                ? index?.getQuery(debouncedQuery.current)
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
    <span data-uiid="docsSearch" class="search-wrap">
        <TextField
            id="concept-search"
            placeholder={SEARCH_SYMBOL}
            description={(l) => l.ui.docs.field.search}
            bind:text={query}
            fill
        />
    </span>
    {#if !searchActive}
        <span data-uiid="docsModeToggle">
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
        </span>
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
    data-uiid="documentation"
    aria-label={$locales.getPlainText((l) => l.ui.docs.label)}
    onpointerup={handleDrop}
    bind:this={view}
    bind:clientWidth={viewWidth}
    bind:clientHeight={viewHeight}
>
    <div class="content">
        <!-- Search mode is prioritized over a selected concept or the home page -->
        {#if searchActive}
            {#if results}
                {#each results.slice(0, resultLimit) as [concept, text]}
                    {@const match = text[0]}
                    {@const start = text[1]}
                    {@const end = text[2]}
                    <div class="result">
                        <CodeView
                            {concept}
                            node={summarizeUnionTypes(
                                concept.getRepresentation($locales),
                            )}
                        />
                        <!-- Show the matching text, highlighting the matched range. -->
                        <div class="matches">
                            <Note
                                >{match.substring(0, start)}<span class="match"
                                    >{match.substring(start, end)}</span
                                >{match.substring(end)}</Note
                            >
                        </div>
                    </div>
                {:else}
                    <Notice text={(l) => l.ui.docs.note.noMatches} />
                {/each}
                <!-- Infinite-scroll sentinel: reveals another page when reached. -->
                <div bind:this={resultsSentinel} aria-hidden="true"></div>
            {:else}
                <!-- Query too short to search yet: prompt to keep typing. -->
                <Notice text={(l) => l.ui.docs.note.keepTyping} />
            {/if}
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
                {:else if currentConcept instanceof GalleryHowConcept}
                    <HowToConceptView concept={currentConcept} />
                {:else}
                    <CodeView
                        node={currentConcept.getRepresentation($locales)}
                        concept={currentConcept}
                    />
                {/if}
                <!-- Home page is default. -->
            {:else if index}
                {#if mode === 'howto'}
                    {#if howTos === undefined}
                        <Spinning></Spinning>
                    {:else}
                        {#if !standalone && gallery}
                            <Mode
                                modes={(l) => l.ui.docs.mode.howToFilter}
                                choice={galleryOnly ? 1 : 0}
                                select={(choice) => {
                                    galleryOnly = choice === 1;
                                }}
                            />
                        {/if}
                        {#if galleryHowConcepts.length > 0}
                            <Subheader
                                text={(l) => l.ui.docs.how.category.gallery}
                            />
                            <div class="howtos">
                                {#each galleryHowConcepts as how}
                                    <CodeView
                                        node={how.getRepresentation()}
                                        concept={how}
                                        elide
                                    />
                                {/each}
                            </div>
                        {/if}

                        {@const builtInHowTo = index.concepts.filter(
                            (c) => c instanceof HowConcept,
                        )}
                        {#each Object.keys(HowToCategories) as category}
                            {@const categoryHowTos = builtInHowTo.filter(
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
                            {row}
                            describe={false}
                        />
                    {:else}
                        <Subheader
                            text={(l) => l.ui.docs.purposes.Project.header}
                        />
                        <em
                            ><LocalizedText
                                path={(l) => l.ui.docs.note.empty}
                            /></em
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
                        text={(l) => l.ui.docs.header.animation}
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
                {:else if isContentPurpose(purpose)}
                    <!-- purpose is now narrowed to ContentPurpose -->
                    {@const primary = index
                        .getPrimaryConceptsWithPurpose(purpose)
                        .filter(
                            (s) =>
                                !(
                                    s instanceof NodeConcept &&
                                    (s.template instanceof Literal ||
                                        s.template instanceof CompositeLiteral)
                                ),
                        )}
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
                        {row}
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

    /* The search field's parent needs to be block so the field fills width. */
    .search-wrap {
        display: block;
    }

    .path {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        overflow-x: auto;
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

    .howtos {
        display: flex;
        flex-direction: column;
        gap: 1em;
    }
</style>
