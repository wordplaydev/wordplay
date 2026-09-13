<script lang="ts">
    import { browser } from '$app/environment';
    import { afterNavigate } from '$app/navigation';
    import { page } from '$app/state';
    import type { Crumb } from '@components/app/getBreadcrumbs';
    import Breadcrumbs from '@components/app/Breadcrumbs.svelte';
    import Header from '@components/app/Header.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Documentation from '@components/concepts/Documentation.svelte';
    import { DefaultMode, Modes } from '@components/concepts/GuideHistory';
    import placeLabel from '@components/concepts/placeLabel';
    import {
        setConceptIndex,
        setConceptPath,
        setProject,
    } from '@components/project/Contexts';
    import type Concept from '@concepts/Concept';
    import ConceptIndex from '@concepts/ConceptIndex';
    import {
        currentConcept,
        popTo,
        remapConcepts,
        type GuideHistory,
        type GuidePlace,
    } from '@components/concepts/GuideHistory';
    import {
        getConceptFromURL,
        getEnumFromURL,
        getKitFromURL,
        getQueryFromURL,
        kitURL,
        PARAM_PURPOSE,
        PARAM_SECTION,
        setConceptInURL,
        setEnumInURL,
        setQueryInURL,
    } from '@concepts/ConceptParams';
    import KitView from '@components/concepts/KitView.svelte';
    import { Purpose } from '@concepts/Purpose';
    import { DOCUMENTATION_SYMBOL } from '@parser/Symbols';
    import { HowTos, Locales, locales } from '@db/Database';
    import Project from '@db/projects/Project';
    import Source from '@nodes/Source';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { localeGoto } from '@util/localeGoto';
    import { debounced } from '@util/debounce.svelte';

    // Initialize concept with URL.
    let concept: Concept | undefined = $state(undefined);

    // The search query, initialized from the URL so a shared/refreshed link
    // restores results. Two-way bound to Documentation; a debounced copy is what
    // we write back to the URL, so typing doesn't spam navigation history.
    // Reading url.searchParams during prerendering throws, so fall back to
    // defaults at build time and read the real params during browser hydration.
    let searchQuery = $state(
        browser ? getQueryFromURL(page.url.searchParams) : '',
    );
    const debouncedSearch = debounced(() => searchQuery, 400);

    // The browsing location (section + code subsection), restored from the URL
    // and two-way bound to Documentation, so a refresh/share keeps the location.
    const sectionFallback = () => DefaultMode;
    let guideSection = $state(
        browser
            ? getEnumFromURL(
                  page.url.searchParams,
                  PARAM_SECTION,
                  Modes,
                  sectionFallback(),
              )
            : sectionFallback(),
    );
    let guidePurpose = $state(
        browser
            ? getEnumFromURL(
                  page.url.searchParams,
                  PARAM_PURPOSE,
                  Object.values(Purpose),
                  Purpose.Outputs,
              )
            : Purpose.Outputs,
    );

    // Create the navigation history for children, initialized empty (home).
    let path = writable<GuideHistory>([]);
    setConceptPath(path);

    /** Build a (shallow) history from the URL: a browse section (the bottom/home of the
     *  history), with the named concept or search on top of it. The URL only records the
     *  current location + section filters; the deeper in-app stack lives in the path
     *  store and is navigated with the breadcrumb's back/home/crumb controls. */
    function historyFromURL(): GuideHistory {
        const section: GuidePlace = {
            kind: 'section',
            mode: guideSection,
            purpose: guidePurpose,
        };
        const c = getConceptFromURL(index, page.url.searchParams);
        if (c) return [section, { kind: 'concept', concept: c }];
        const q = getQueryFromURL(page.url.searchParams);
        return q.trim().length > 0
            ? [section, { kind: 'search', query: q }]
            : [section];
    }

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
    let kit = $derived(
        browser ? getKitFromURL(page.url.searchParams) : undefined,
    );

    /** Show a kit, or leave one (`undefined`) for the browser below. Navigating is the
     *  whole of it: `kit` follows the URL. */
    function showKit(
        name: string | undefined,
        version: number | undefined = undefined,
    ) {
        localeGoto(name === undefined ? '/guide' : kitURL(name, version), {
            noScroll: true,
        });
    }

    let mounted = $state(false);

    // The pinned breadcrumb bar's height, measured so the Documentation search
    // header can offset its sticky `top` and pin directly below it (the trail
    // can wrap to multiple lines, so this can't be a constant).
    let breadcrumbHeight = $state(0);

    onMount(() => {
        // Before showing, wait for how tos to load.
        Locales.loadHowTos($locales.getLocaleString()).then(() => {
            path.set(historyFromURL());
            mounted = true;
        });
    });

    // On browser back/forward, restore the location and filters from the URL. Our own
    // (programmatic) navigations already updated the stack, so we ignore non-popstate
    // navigations — re-deriving from the URL would flatten the in-app history.
    afterNavigate(({ type }) => {
        if (type !== 'popstate') return;
        const urlQuery = getQueryFromURL(page.url.searchParams);
        if (searchQuery !== urlQuery) searchQuery = urlQuery;
        guideSection = getEnumFromURL(
            page.url.searchParams,
            PARAM_SECTION,
            Modes,
            sectionFallback(),
        );
        guidePurpose = getEnumFromURL(
            page.url.searchParams,
            PARAM_PURPOSE,
            Object.values(Purpose),
            Purpose.Outputs,
        );
        path.set(historyFromURL());
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

    let index = $derived(
        ConceptIndex.make(
            project,
            $locales,
            howTos instanceof Promise ? [] : howTos,
            // Never a sign-in gate despite how it read: `getUser()` returns
            // the store, so this was always the truthy branch. The cache only
            // holds what the rules let this viewer read, so pass it through.
            HowTos.allAccessiblePublishedHowTos,
        ),
    );

    // svelte-ignore state_referenced_locally
    let indexStore = $state({ index });
    setConceptIndex(indexStore);

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
        // Nothing to remap on the first build: `onMount` resolves the history
        // from the URL against whatever index is current then.
        if (previous === undefined || previous === rebuilt) return;
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

    $effect(() => {
        concept = currentConcept($path);
    });

    // The guide's concept path, appended to the route breadcrumbs as a single
    // unified trail: 🏠 Home / 📕 Guide — code — pattern / <concept> / … The 📕 Guide
    // crumb always reflects the current section state (e.g. "Guide — code — pattern"),
    // so the breadcrumb is consistent whether browsing the landing or drilled into a
    // concept. At the landing it's the current (non-link) location; once we've drilled
    // in it links back to that section, naming the destination it returns to.
    let extra = $derived.by<Crumb[]>(() => {
        // A kit replaces the browser entirely, so the trail is Guide (back to the
        // browser) then the kit's own name.
        if (kit)
            return [
                {
                    emoji: DOCUMENTATION_SYMBOL,
                    text: $locales.getPlainText((l) => l.ui.page.guide.header),
                    action: () => showKit(undefined),
                },
                { text: kit.name, current: true },
            ];
        // Empty only before mount (path starts empty); afterwards the bottom is a section.
        if ($path.length === 0) return [];
        // The bottom of the history is always the section the Guide crumb names (and pops
        // back to). Only the language section has a subsection to add, e.g.
        // "code — pattern"; how-to, glossary and kits name themselves.
        const section = $path[0];
        const header = $locales.getPlainText((l) => l.ui.page.guide.header);
        let label = header;
        if (section.kind === 'section') {
            // Indexed by the section's own position rather than branched on, so a
            // section added to `Modes` names itself instead of falling through to
            // "code" — which is what glossary used to do.
            const which = Modes.indexOf(section.mode);
            const mode = $locales.getPlainText(
                (l) => l.ui.docs.mode.browse.labels[which],
            );
            label =
                section.mode === 'language'
                    ? `${header} — ${mode} — ${$locales.getPlainText(
                          (l) => l.ui.docs.purposes[section.purpose].header,
                      )}`
                    : `${header} — ${mode}`;
        }
        // At the landing the section is the current page (non-link); once drilled in it
        // becomes a back-link that pops the concept path to the section.
        const guide: Crumb =
            $path.length === 1
                ? { emoji: DOCUMENTATION_SYMBOL, text: label, current: true }
                : {
                      emoji: DOCUMENTATION_SYMBOL,
                      text: label,
                      action: () => path.set(popTo($path, 0)),
                  };
        const rest = $path.slice(1).map((place, i): Crumb => {
            const index = i + 1;
            const body = { text: placeLabel(place, $locales) };
            return index === $path.length - 1
                ? { ...body, current: true }
                : { ...body, action: () => path.set(popTo($path, index)) };
        });
        return [guide, ...rest];
    });

    // When the concept path or (debounced) search query changes, navigate to the
    // corresponding URL so the guide is shareable and survives a refresh.
    $effect(() => {
        // A kit's URL is written by `showKit`, and rebuilding one from the concept path
        // here would strip the very param that put us on this page.
        if (kit !== undefined) return;
        if (browser && $path && mounted) {
            const newParams = new URLSearchParams();
            setConceptInURL(concept ?? undefined, index, newParams);
            setQueryInURL(debouncedSearch.current, newParams);
            setEnumInURL(
                newParams,
                PARAM_SECTION,
                guideSection,
                sectionFallback(),
            );
            setEnumInURL(
                newParams,
                PARAM_PURPOSE,
                guidePurpose,
                Purpose.Outputs,
            );

            const newSearch = newParams.toString()
                ? `?${newParams.toString()}`
                : '';
            if (window.location.search !== newSearch) {
                localeGoto(`/guide${newSearch}`, {
                    replaceState: window.location.search === '',
                    // Keep focus (and scroll) so syncing the URL while the creator
                    // is typing in the search field doesn't steal focus from it.
                    keepFocus: true,
                    noScroll: true,
                });
            }
        }
    });
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
            bind:mode={guideSection}
            bind:purpose={guidePurpose}
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
        padding: var(--wordplay-spacing) calc(2 * var(--wordplay-spacing)) 0;
        margin-bottom: calc(-1 * var(--wordplay-spacing));
    }

    .header {
        padding: 0 calc(2 * var(--wordplay-spacing))
            calc(2 * var(--wordplay-spacing));
    }

    .kit {
        padding: 0 calc(2 * var(--wordplay-spacing))
            calc(2 * var(--wordplay-spacing));
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>
