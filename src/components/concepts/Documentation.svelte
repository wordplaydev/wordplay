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
    import ConceptGroupView from '@components/concepts/ConceptGroupView.svelte';
    import ConceptPreview from '@components/concepts/ConceptPreview.svelte';
    import ConceptsView from '@components/concepts/ConceptsView.svelte';
    import ConceptView from '@components/concepts/ConceptView.svelte';
    import { summarizeUnionTypes } from '@components/concepts/elideNode';
    import FunctionConceptView from '@components/concepts/FunctionConceptView.svelte';
    import {
        currentSearch,
        navigateSection,
        popTo,
        reconcileSearch,
        sameHistory,
        currentConcept as topConcept,
    } from '@components/concepts/GuideHistory';
    import placeLabel from '@components/concepts/placeLabel';
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
        HOME_SYMBOL,
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
    import { withMonoEmoji } from '@unicode/emoji';
    import { debounced } from '@util/debounce.svelte';
    import { tick, untrack } from 'svelte';
    import { get } from 'svelte/store';
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

    /** True when the top of the navigation history is a search location: we show the
     *  search results and hide the browsing controls. The search box and the search
     *  location are kept in sync by the two effects below. */
    let searchActive = $derived(currentSearch($path) !== undefined);

    /** The current concept, when the top of the history is a concept. */
    let currentConcept = $derived(topConcept($path));

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

    // Re-derive the how-to filter default when the project's gallery actually
    // changes while the guide is open. The first run only records the gallery (no
    // re-derive), so a value the host restored from the URL survives load.
    let lastGallery: string | null | undefined;
    let galleryTracked = false;
    $effect(() => {
        const currentGallery = project.getGallery();
        if (!galleryTracked) {
            galleryTracked = true;
            lastGallery = currentGallery;
        } else if (currentGallery !== lastGallery) {
            lastGallery = currentGallery;
            galleryOnly = currentGallery == null && !standalone;
        }
    });
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

    // Keep the search box and the navigation history in sync. The box (`query`) and
    // the top search location are two views of the same thing; these two guarded,
    // convergent effects maintain the invariant "query non-empty ⇔ top of history is a
    // search with that query" without looping:
    //  - typing pushes/refines/pops a search location;
    //  - navigating (push concept, back, home, go-to crumb) updates the history, and
    //    the box follows — cleared on a concept/home, restored on a search.

    // query → history. Reads the store untracked so this depends only on `query`;
    // reconcileSearch returns the same reference when nothing changes, so we skip
    // redundant writes (and avoid a feedback loop with the effect below).
    $effect(() => {
        const q = query;
        const history = get(path);
        const next = reconcileSearch(history, q);
        if (next !== history) path.set(next);
    });

    // history → query. Depends only on the history (query is read untracked); clears
    // the box on a concept/home location and restores it on a search location.
    $effect(() => {
        const top = $path.at(-1);
        const desired = top?.kind === 'search' ? top.query : '';
        if (untrack(() => query) !== desired) query = desired;
    });

    /** Remember the previous history we visited */
    let previousPath: ConceptPath = $state([]);

    /** When the history changes to a different location, scroll to top. */
    $effect(() => {
        if (!sameHistory(previousPath, $path)) {
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

    // Navigation: the history → query effect keeps the search box in sync with each of
    // these, so they only need to update the history.

    /** Pop the current location, returning to the previous concept or search results. */
    function back() {
        path.set($path.slice(0, -1));
    }

    /** Return to home: the bottom of the history, which is always a browse section. */
    function home() {
        path.set(popTo($path, 0));
    }

    /** Jump to the location at `index` in the breadcrumb, dropping everything after it. */
    function goTo(index: number) {
        path.set(popTo($path, index));
    }

    /** Choose a browse section/subsection. Moving between sections modifies the current
     *  location; from a concept/search it adds a new section location (see
     *  {@link navigateSection}). Also updates the live mode/purpose the browse view and
     *  toggles read (kept in sync with the active section by the effect below). */
    function chooseSection(
        newMode: (typeof Modes)[number],
        newPurpose: PurposeType,
    ) {
        const m = $blocks ? 'language' : newMode;
        mode = m;
        purpose = newPurpose;
        path.set(navigateSection($path, m, newPurpose));
    }

    // history → section filters. When the top of the history is a section (we navigated
    // back/over to a browse page), restore the section + subsection it captured into the
    // live mode/purpose (clamped to language while in blocks mode). Reads mode/purpose
    // untracked so this depends only on the history and blocks state.
    $effect(() => {
        const top = $path.at(-1);
        if (top?.kind === 'section') {
            const m = $blocks ? 'language' : top.mode;
            if (untrack(() => mode) !== m) mode = m;
            if (untrack(() => purpose) !== top.purpose) purpose = top.purpose;
        }
    });

    // If blocks mode is on, the guide only shows language (code) concepts.
    $effect(() => {
        if ($blocks && mode !== 'language') mode = 'language';
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
        <!-- The section + subsection switchers form a filter grid: their labels share a
             right-aligned column and their option groups a left-aligned column. Each Mode
             uses `display: contents` (the `grid` prop) so its label/group are items here. -->
        <div class="filters">
            <Mode
                grid
                uiid="docsModeToggle"
                modes={(l) => l.ui.docs.mode.browse}
                icons={[DOCUMENTATION_SYMBOL, IDEA_SYMBOL]}
                choice={Modes.indexOf(mode)}
                select={(choice) => chooseSection(Modes[choice], purpose)}
            />
            {#if mode === 'language'}
                <Mode
                    grid
                    modes={(l) => l.ui.docs.mode.purpose}
                choice={Object.keys(Purpose).indexOf(purpose)}
                select={(choice) =>
                    chooseSection(mode, Object.values(Purpose)[choice])}
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
        </div>
    {/if}

    {#if !standalone && $path.length > 1}
        <nav
            class="path"
            aria-label={$locales.getPlainText(
                (l) => l.ui.docs.breadcrumb.label,
            )}
        >
            <Button tip={(l) => l.ui.docs.button.back} icon="←" action={back}
            ></Button>
            {#each $path as place, index}
                {@const isLast = index === $path.length - 1}
                {#if index > 0}<span class="sep" aria-hidden="true">/</span
                    >{/if}{#if index === 0}<button
                        type="button"
                        class="crumb home"
                        title={$locales.getPlainText(
                            (l) => l.ui.docs.button.home,
                        )}
                        aria-label={$locales.getPlainText(
                            (l) => l.ui.docs.breadcrumb.home,
                        )}
                        onclick={home}>{withMonoEmoji(HOME_SYMBOL)}</button
                    >{:else}{@const label = placeLabel(
                        place,
                        $locales,
                    )}{#if isLast}<span
                            class="crumb current"
                            aria-current="page">{label}</span
                        >{:else}<button
                            type="button"
                            class="crumb"
                            onclick={() => goTo(index)}>{label}</button
                        >{/if}{/if}
            {/each}
        </nav>
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
                        <ConceptPreview
                            {concept}
                            elide
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
                <Note
                    ><LocalizedText
                        path={(l) => l.ui.docs.note.keepTyping}
                    /></Note
                >
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
                    <ConceptPreview
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
                        <HeaderAndExplanation
                            text={(l) => l.ui.docs.how.explain}
                            sub
                        />
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
                                {#each galleryHowConcepts as how (how.getHowToId())}
                                    <ConceptPreview
                                        concept={how}
                                        node={how.getRepresentation()}
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
                                    {#each categoryHowTos as how (how.how.id)}
                                        <ConceptPreview
                                            concept={how}
                                            node={how.getRepresentation()}
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
        gap: calc(3 * var(--wordplay-spacing));
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

    /* Filter grid: the section + subsection Modes (each `display: contents`) drop their
       labels into a right-aligned first column and their option groups into a left-aligned
       second column. */
    .filters {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        column-gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing-half);
        align-items: baseline;
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
        gap: var(--wordplay-spacing-half);
        padding-left: var(--wordplay-spacing);
        align-items: center;
    }

    /* A breadcrumb crumb, styled like a plain text link. */
    .crumb {
        flex-shrink: 0;
        font: inherit;
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        white-space: nowrap;
        color: var(--wordplay-highlight-color);
        text-decoration: none;
        cursor: pointer;
    }

    .crumb:focus,
    .crumb:hover {
        outline: none;
        text-decoration: underline;
        text-decoration-thickness: var(--wordplay-focus-width);
        text-decoration-color: var(--wordplay-focus-color);
    }

    /* The current location: inactive — greyed, no underline. */
    .crumb.current {
        color: var(--wordplay-inactive-color);
        cursor: default;
    }

    .sep {
        flex-shrink: 0;
        color: var(--wordplay-relation-color);
        user-select: none;
    }

    .result {
        margin-top: var(--wordplay-spacing);
    }

    /* Cap how-to output previews in search results so they don't fill the full result row. */
    .result :global(.view.how) {
        max-width: 10em;
    }

    .matches {
        margin-left: var(--wordplay-spacing);
    }
    .match {
        color: var(--wordplay-highlight-color);
    }

    .howtos {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(10em, 1fr));
        gap: 1em;
        align-items: start;
    }
</style>
