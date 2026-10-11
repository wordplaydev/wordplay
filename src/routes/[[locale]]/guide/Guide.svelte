<script lang="ts">
    import { browser } from '$app/env';
    import { afterNavigate } from '$app/navigation';
    import { page } from '$app/state';
    import type { Crumb } from '#components/app/getBreadcrumbs.ts';
    import Breadcrumbs from '#components/app/Breadcrumbs.svelte';
    import Header from '#components/app/Header.svelte';
    import MarkupHTMLView from '#components/concepts/MarkupHTMLView.svelte';
    import Documentation from '#components/concepts/Documentation.svelte';
    import {
        DefaultMode,
        DefaultPurpose,
        currentSearch,
        landingOf,
        locationOf,
        Modes,
        remapConcepts,
        type GuideHistory,
        type GuidePlace,
    } from '#components/concepts/GuideHistory.ts';
    import {
        conceptFromTokens,
        guideSegments,
        parseGuidePath,
        placePath,
        type GuidePath,
    } from '#components/concepts/guidePath.ts';
    import placeLabel from '#components/concepts/placeLabel.ts';
    import {
        setConceptIndex,
        setConceptPath,
        setProject,
    } from '#components/project/Contexts.ts';
    import type Concept from '#concepts/Concept.ts';
    import ConceptIndex from '#concepts/ConceptIndex.ts';
    import {
        getConceptFromURL,
        getEnumFromURL,
        getKitFromURL,
        getQueryFromURL,
        kitURL,
        PARAM_CONCEPT,
        PARAM_KIT,
        PARAM_KIT_VERSION,
        PARAM_PURPOSE,
        PARAM_QUERY,
        PARAM_SECTION,
        setQueryInURL,
    } from '#concepts/ConceptParams.ts';
    import KitView from '#components/concepts/KitView.svelte';
    import { Purpose } from '#concepts/Purpose.ts';
    import { DOCUMENTATION_SYMBOL } from '#parser/Symbols.ts';
    import { HowTos, Locales, locales } from '#db/Database.ts';
    import type GalleryHowTo from '#db/howtos/HowToDatabase.svelte.ts';
    import Project from '#db/projects/Project.ts';
    import Source from '#nodes/Source.ts';
    import { onMount, untrack } from 'svelte';
    import { get, writable } from 'svelte/store';
    import { must } from '#util/nullable.ts';
    import { localeGoto, localePath } from '#util/localeGoto.ts';
    import type { AppPath } from '#util/appPath.ts';

    /**
     * The kit this page is showing, when the URL names one (#8).
     *
     * A kit's page lives in the guide rather than beside it, so a kit's documentation is
     * rendered by exactly the views that render a borrowed kit's — one renderer, so the
     * two can't drift. It replaces the documentation browser rather than sitting inside
     * it, because a kit is a whole subject, not a concept within the language.
     *
     * Read from the URL rather than latched in state, because a kit is reached by
     * ordinary link as well as by button: a tile, a version list, a notification. Held
     * in state it was only ever set on mount and on `popstate`, so following one of
     * those links while already in the guide left `kit` undefined — and the effect
     * below, seeing no kit, rewrote the URL from the concept path and stripped the very
     * param that had just been navigated to.
     */
    let kit = $derived.by(() => {
        const parsed = parseGuidePath(guideSegments(page.url.pathname));
        if (parsed.kind !== 'kit')
            // The `?kit=` a link from before kits had paths carries; `onMount` moves it.
            return browser ? getKitFromURL(page.url.searchParams) : undefined;
        // The version rides in the query, which a prerender can't read.
        const version = browser
            ? Number(page.url.searchParams.get(PARAM_KIT_VERSION))
            : NaN;
        return {
            name: parsed.name,
            version:
                Number.isInteger(version) && version > 0 ? version : undefined,
        };
    });

    /** Show a kit, or leave one (`undefined`) for the browser below. Navigating is the
     *  whole of it: `kit` follows the URL. */
    function showKit(
        name: string | undefined,
        version: number | undefined = undefined,
    ) {
        localeGoto(name === undefined ? '/guide' : kitURL(name, version), {
            reset: false,
        });
    }

    // The pinned breadcrumb bar's height, measured so the Documentation search
    // header can offset its sticky `top` and pin directly below it (the trail
    // can wrap to multiple lines, so this can't be a constant).
    let breadcrumbHeight = $state(0);

    /** The params guide URLs used before locations were paths. */
    const LegacyParams = [
        PARAM_CONCEPT,
        PARAM_SECTION,
        PARAM_PURPOSE,
        PARAM_KIT,
    ] as const;

    onMount(() => {
        // A link from before locations were paths: say the same thing as a path, in
        // place. The history already read it (see `historyFromURL`), and the first URL
        // sync replaces the entry; only a kit, which has no history, moves itself.
        const legacyKit = getKitFromURL(page.url.searchParams);
        if (
            legacyKit !== undefined &&
            guideSegments(page.url.pathname).length === 0
        )
            localeGoto(kitURL(legacyKit.name, legacyKit.version), {
                replace: true,
                reset: false,
            });
        // Not awaited before showing anything: the index builds without them, and a
        // how-to the URL names is resolved when they land (see `pendingConcept`).
        // Waiting here is what showed the default page for a second before the one
        // the URL named.
        Locales.loadHowTos($locales.getLocaleString());
        // Deliberately not awaited with the bundle above: the guide is readable
        // without them, and holding the whole page on a network round-trip to show
        // one group at the bottom of one section would be the wrong trade.
        HowTos.getListedHowTos().then((listed) => (community = listed));
    });

    // There's no actual project; the documentation component just relies on one to have contexts.
    let project = $derived(
        Project.make(null, 'guide', Source.make(''), [], $locales.getLocales()),
    );

    // Expose the guide project so ExpressionPlaceholderView can resolve input placeholder labels.
    let projectStore = writable<Project | undefined>(undefined);
    setProject(projectStore);
    $effect(() => {
        projectStore.set(project);
    });

    let howToStore = Locales.howTos;

    /** Keep the how tos loaded whenever the language changes */
    $effect(() => {
        Locales.loadHowTos($locales.getLocaleString());
    });

    let howTos = $derived($howToStore[$locales.getLocaleString()]);

    /**
     * The how-tos a moderator has listed in the guide (#906), read once on mount.
     *
     * Everyone gets these, signed out included — that is what being listed means —
     * where `allAccessiblePublishedHowTos` is only what this reader could already
     * reach.
     */
    let community: GalleryHowTo[] = $state([]);

    /** Both sets, so a link to either resolves to a concept. Which group each
     *  appears under is `Documentation`'s decision, not this one's. Deduped by id,
     *  because someone in the gallery a listed how-to came from has it in both, and
     *  two concepts for one how-to would leave `getGalleryHowConcept` answering
     *  with whichever was built last. */
    let everyGalleryHowTo = $derived([
        ...HowTos.allAccessiblePublishedHowTos,
        ...community.filter(
            (listed) =>
                !HowTos.allAccessiblePublishedHowTos.some(
                    (mine) => mine.getHowToId() === listed.getHowToId(),
                ),
        ),
    ]);

    let index = $derived(
        ConceptIndex.make(
            project,
            $locales,
            howTos instanceof Promise ? [] : howTos,
            // Never a sign-in gate despite how it read: `getUser()` returns
            // the store, so this was always the truthy branch. The cache only
            // holds what the rules let this viewer read, so pass it through.
            everyGalleryHowTo,
        ),
    );

    // svelte-ignore state_referenced_locally
    let indexStore = $state({ index });
    setConceptIndex(indexStore);

    const ownerOf = (concept: Concept) => index.getConceptOwner(concept);

    /**
     * A `?concept=` the index couldn't resolve when the URL was read: in practice a
     * how-to, before its bundle lands. Held so the index rebuild below can resolve it,
     * and so the URL isn't rewritten without it in the meantime.
     */
    let pendingConcept: string | undefined = undefined;

    /** The history last read from the URL, so the pending concept above is only ever
     *  waited on while the reader hasn't navigated anywhere else. */
    let readFromURL: GuideHistory | undefined = undefined;

    /** The location the URL names, as a history: the section it lives in, with the
     *  concept or search on top. That is all a location is — the way here is the
     *  browser's history, not this one's. Read from the path, which a prerender can
     *  see, so a section's landing is rendered on the server; the query can only be
     *  read in the browser. */
    function historyFromURL(): GuideHistory {
        const params = browser ? page.url.searchParams : undefined;
        const segments = guideSegments(page.url.pathname);
        const parsed = parseGuidePath(segments);
        const fallback: GuidePlace & { kind: 'section' } = {
            kind: 'section',
            mode: DefaultMode,
            purpose: DefaultPurpose,
        };
        // A link from before locations were paths names everything in its query.
        const legacy =
            params !== undefined &&
            segments.length === 0 &&
            LegacyParams.some((key) => params.has(key));
        const section: GuidePlace & { kind: 'section' } = legacy
            ? {
                  kind: 'section',
                  mode: getEnumFromURL(
                      params,
                      PARAM_SECTION,
                      Modes,
                      DefaultMode,
                  ),
                  purpose: getEnumFromURL(
                      params,
                      PARAM_PURPOSE,
                      Object.values(Purpose),
                      DefaultPurpose,
                  ),
              }
            : parsed.kind === 'section'
              ? parsed
              : fallback;
        const legacyToken = legacy ? params.get(PARAM_CONCEPT) : null;
        const concept =
            legacyToken !== null
                ? getConceptFromURL(index, params ?? new URLSearchParams())
                : parsed.kind === 'concept'
                  ? conceptFromTokens(index, parsed.tokens)
                  : undefined;
        const named =
            legacyToken !== null && legacyToken.length > 0
                ? legacyToken
                : parsed.kind === 'concept'
                  ? parsed.tokens.join('/')
                  : undefined;
        pendingConcept = concept === undefined ? named : undefined;
        let history: GuideHistory;
        if (concept) {
            const place: GuidePlace = { kind: 'concept', concept };
            history = [landingOf(place, ownerOf, section), place];
        } else {
            const query = params ? getQueryFromURL(params) : '';
            history =
                query.trim().length > 0
                    ? [section, { kind: 'search', query }]
                    : [section];
        }
        readFromURL = history;
        return history;
    }

    /** The URL for a history's location, keeping every param this page doesn't own —
     *  including the `dialog` one that is the Dialog widget's open state, which
     *  rebuilding from nothing used to delete, shutting a dialog mid-choice. */
    function urlFor(history: GuideHistory): {
        path: GuidePath;
        params: URLSearchParams;
    } {
        const params = new URLSearchParams(page.url.search);
        for (const key of [...LegacyParams, PARAM_QUERY, PARAM_KIT_VERSION])
            params.delete(key);
        const top = history.at(-1) ?? {
            kind: 'section',
            mode: DefaultMode,
            purpose: DefaultPurpose,
        };
        if (top.kind === 'search') setQueryInURL(top.query, params);
        return { path: placePath(top, index), params };
    }

    /** Whether the URL already names this location, whatever its params' order and
     *  whatever locale prefixes its path. */
    function showsLocation(target: {
        path: string;
        params: URLSearchParams;
    }): boolean {
        const sorted = (p: Pick<URLSearchParams, 'toString'>) => {
            const copy = new URLSearchParams(p.toString());
            copy.sort();
            return copy.toString();
        };
        return (
            guideSegments(target.path).join('/') ===
                guideSegments(page.url.pathname).join('/') &&
            sorted(target.params) === sorted(page.url.searchParams)
        );
    }

    // The navigation history children push onto. Read from the URL during init rather
    // than on mount, so the first render is the page the URL names.
    let path = writable<GuideHistory>(historyFromURL());
    setConceptPath(path);

    /** The search box, bound to Documentation only so it starts with the URL's query:
     *  left to start empty, Documentation's box-to-history effect would pop the search
     *  the URL named before the history-to-box effect could fill the box in. */
    let searchQuery = $state(currentSearch(get(path)) ?? '');

    /** The search string of the URL this page last wrote, so the navigation it starts
     *  isn't mistaken for the reader going somewhere: by the time it lands, the reader
     *  may have typed past it. */
    let written: string | undefined = undefined;

    /** Go to a location, as a crumb does. Pushed like any other move, so Back undoes it. */
    function go(place: GuidePlace) {
        path.set(
            place.kind === 'section'
                ? [place]
                : [
                      landingOf(place, ownerOf, {
                          kind: 'section',
                          mode: DefaultMode,
                          purpose: DefaultPurpose,
                      }),
                      place,
                  ],
        );
    }

    // Whenever the URL changes under us — Back, Forward, or an ordinary link — and no
    // longer names the location shown, follow it. Only the history is set: the search
    // box and the section chooser follow the history, and setting them as well is what
    // used to push a search onto a restored concept and rewrite the URL, taking every
    // Forward entry with it.
    afterNavigate(({ to, type }) => {
        // Only a `goto` can be our own write; Back to the same URL is the reader's.
        const ours =
            type === 'goto' &&
            to !== null &&
            `${to.url.pathname}${to.url.search}` === written;
        written = undefined;
        if (ours) return;
        if (kit !== undefined) return;
        if (!showsLocation(urlFor(get(path)))) path.set(historyFromURL());
    });

    /** The index the history's concepts were resolved against, so a rebuild can
     *  remap them. The history holds `Concept` objects by reference, and
     *  changing locale rebuilds the index with fresh ones — after which the
     *  concept still renders, because it carries its own documentation, while
     *  everything the *new* index is asked about it comes back empty. That is
     *  why a concept's how-to links vanished on a locale change and came back on
     *  a refresh: `getHowTosForConcept` is a `Map` keyed by concept identity. */
    let resolvedAgainst: ConceptIndex | undefined = undefined;

    $effect(() => {
        const rebuilt = index;
        indexStore.index = rebuilt;

        const previous = resolvedAgainst;
        resolvedAgainst = rebuilt;
        if (previous === undefined || previous === rebuilt) return;
        // A concept the URL named that couldn't be resolved yet may resolve now.
        if (pendingConcept !== undefined && get(path) === readFromURL) {
            path.set(historyFromURL());
            return;
        }
        path.update((history) => {
            const remapped = remapConcepts(history, (concept) =>
                rebuilt.getCorresponding(concept),
            );
            /* Compared by object identity, and deliberately not with
               `sameHistory`: that asks `isEqualTo`, which is the very comparison
               that calls a stale concept and its replacement the same thing — so
               using it here computed the remap and then threw it away, leaving
               the bug exactly as it was. What has to change is the reference. */
            const moved =
                remapped.length !== history.length ||
                remapped.some((place, index) => {
                    const before = history[index];
                    if (before === undefined) return true;
                    return (
                        place.kind !== before.kind ||
                        (place.kind === 'concept' &&
                            before.kind === 'concept' &&
                            place.concept !== before.concept)
                    );
                });
            return moved ? remapped : history;
        });
    });

    /** The label of a section, from the positional tuple with one entry per mode. */
    function sectionLabel(mode: (typeof Modes)[number]): string {
        const which = Modes.indexOf(mode);
        return $locales.getPlainText((l) =>
            must(l.ui.docs.mode.browse.labels[which], 'a mode label'),
        );
    }

    // The guide's half of the breadcrumb, appended to the route's: where the location
    // lives, not how the reader got there — 📕 Guide / Code / Outputs / Phrase / size.
    // Back and Forward are the way here, so every crumb but the last is a link that
    // goes somewhere, rather than one that pops a history.
    let extra = $derived.by<Crumb[]>(() => {
        const header = $locales.getPlainText((l) => l.ui.page.guide.header);
        // A kit replaces the browser entirely: Guide / Kits / the kit.
        if (kit)
            return [
                {
                    emoji: DOCUMENTATION_SYMBOL,
                    text: header,
                    action: () => showKit(undefined),
                },
                {
                    text: sectionLabel('kits'),
                    action: () =>
                        localeGoto('/guide/kits', {
                            reset: false,
                        }),
                },
                { text: kit.name, current: true },
            ];
        const top = $path.at(-1);
        // Empty only before the browser reads the URL.
        if (top === undefined) return [];
        const crumbs: { text: string; emoji?: string; to?: GuidePlace }[] = [
            {
                emoji: DOCUMENTATION_SYMBOL,
                text: header,
                to: {
                    kind: 'section',
                    mode: DefaultMode,
                    purpose: DefaultPurpose,
                },
            },
        ];
        const location = locationOf(top, ownerOf);
        if (location) {
            crumbs.push({
                text: sectionLabel(location.mode),
                to: {
                    kind: 'section',
                    mode: location.mode,
                    purpose: DefaultPurpose,
                },
            });
            if (
                location.mode === 'language' &&
                location.purpose !== undefined
            ) {
                const purpose = location.purpose;
                crumbs.push({
                    text: $locales.getPlainText(
                        (l) => l.ui.docs.purposes[purpose].header,
                    ),
                    to: { kind: 'section', mode: 'language', purpose },
                });
            }
            if (location.owner)
                crumbs.push({
                    text: placeLabel(
                        { kind: 'concept', concept: location.owner },
                        $locales,
                    ),
                    to: { kind: 'concept', concept: location.owner },
                });
        }
        if (top.kind !== 'section')
            crumbs.push({ text: placeLabel(top, $locales) });
        return crumbs.map((crumb, i): Crumb => {
            const body =
                crumb.emoji === undefined
                    ? { text: crumb.text }
                    : { emoji: crumb.emoji, text: crumb.text };
            const destination = crumb.to;
            return i === crumbs.length - 1 || destination === undefined
                ? { ...body, current: true }
                : { ...body, action: () => go(destination) };
        });
    });

    /** Whether the URL has been synced since the page loaded. Only that first sync
     *  replaces the entry, so a URL written some other way is tidied in place. */
    let syncedURL = false;

    // When the location changes, write it to the URL — one push per move, so the
    // browser's Back and Forward are the guide's history. Read from the history alone:
    // reading the search box too (or a debounced copy of it) is what wrote
    // `?concept=X&query=Phrase` and then `?concept=X`, two entries for one click.
    $effect(() => {
        const history = $path;
        // Only the history is tracked. The URL changes before `afterNavigate` follows
        // it, so an effect that also tracked the URL ran once with the old history and
        // the new URL and pushed the old location straight back: Back flickered between
        // the two pages.
        return untrack(() => syncURL(history));
    });

    function syncURL(history: GuideHistory): (() => void) | undefined {
        // A kit's URL is written by `showKit`, and rebuilding one from the concept path
        // here would strip the very param that put us on this page.
        if (kit !== undefined || !browser) return;
        if (history.length === 0) return;
        // Still waiting on a concept the URL named: rewriting now would drop it.
        if (pendingConcept !== undefined && history === readFromURL) return;
        pendingConcept = undefined;
        const target = urlFor(history);
        if (showsLocation(target)) {
            syncedURL = true;
            return;
        }
        const query = target.params.toString();
        const url: AppPath = query ? `${target.path}?${query}` : target.path;
        // Refining a search replaces its entry, and waits for a pause in typing so the
        // router isn't asked to navigate on every keystroke.
        const refining =
            history.at(-1)?.kind === 'search' &&
            page.url.searchParams.has(PARAM_QUERY) &&
            guideSegments(page.url.pathname).join('/') ===
                guideSegments(target.path).join('/');
        const write = () => {
            const first = !syncedURL;
            syncedURL = true;
            written = localePath(url);
            localeGoto(url, {
                // A location just read from the URL is only being tidied into its
                // own path (a legacy query, a concept filed under the wrong
                // subsection), which must not add an entry for Back to land on.
                replace: first || refining || history === readFromURL,
                // Keep focus (and scroll) so syncing the URL while the creator
                // is typing in the search field doesn't steal focus from it.
                reset: false,
            });
        };
        if (history.at(-1)?.kind !== 'search') {
            write();
            return;
        }
        const timer = setTimeout(write, 400);
        return () => clearTimeout(timer);
    }
</script>

<section class="guide" style="--guide-sticky-top: {breadcrumbHeight}px">
    <!-- The breadcrumb bar is a direct child of .guide (not nested in the page
         header) so its sticky containing block spans the full content height and
         it stays pinned while the title/description below it scroll away. -->
    <div class="breadcrumb-bar" bind:clientHeight={breadcrumbHeight}>
        <Breadcrumbs {extra} />
    </div>

    <!-- The page header is chrome — a title and a one-line orientation, the
         same category as a dialog's explanation, which also stays horizontal.
         The documentation below is the reading. -->
    <div class="header">
        <Header text={(l) => l.ui.page.guide.header} />
        <MarkupHTMLView markup={(l) => l.ui.page.guide.description} />
    </div>

    {#if kit}
        <div class="kit">
            <KitView
                name={kit.name}
                version={kit.version}
                show={(version) => showKit(kit?.name, version)}
            />
        </div>
    {:else}
        <Documentation
            {project}
            standalone
            collapse={false}
            bind:query={searchQuery}
            {community}
        ></Documentation>
    {/if}
</section>

<style>
    .guide {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        width: 100%;
        height: 100%;
        gap: var(--wordplay-spacing);
        background: var(--wordplay-background);
        /* Scroll the whole guide here (rather than letting the page's <main>
           scroll) so the sticky breadcrumb bar and search header — both direct
           children — stay pinned for the entire content length, not just the
           first viewport. A sticky element only stays within its containing
           block, which must therefore be the scroll container that holds all
           the content. */
        /* Which axis overflows is the writing mode's business. */
        overflow: auto;
        min-block-size: 0;
    }

    .breadcrumb-bar {
        position: sticky;
        top: 0;
        /* Above the Documentation search header (z-index: 1) so it never bleeds
           through, and opaque so the scrolled-away title/description don't show. */
        z-index: 2;
        background: var(--wordplay-background);
        /* No bottom padding, and a negative margin that cancels the .guide flex
           gap below the bar, so the only space to the title is the breadcrumb's
           own bottom margin — keeping it close as before. */
        padding: var(--wordplay-spacing) var(--wordplay-spacing-double) 0;
        margin-bottom: calc(-1 * var(--wordplay-spacing));
    }

    .header {
        padding: 0 var(--wordplay-spacing-double) var(--wordplay-spacing-double);
    }

    .kit {
        padding: 0 var(--wordplay-spacing-double) var(--wordplay-spacing-double);
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>
