<script lang="ts">
    import { browser } from '$app/environment';
    import { afterNavigate } from '$app/navigation';
    import { page } from '$app/state';
    import type { Crumb } from '@components/app/getBreadcrumbs';
    import PageHeader from '@components/app/PageHeader.svelte';
    import Documentation, {
        Modes,
    } from '@components/concepts/Documentation.svelte';
    import placeLabel from '@components/concepts/placeLabel';
    import {
        getUser,
        setConceptIndex,
        setConceptPath,
        setProject,
    } from '@components/project/Contexts';
    import type Concept from '@concepts/Concept';
    import ConceptIndex from '@concepts/ConceptIndex';
    import {
        currentConcept,
        popTo,
        type GuideHistory,
        type GuidePlace,
    } from '@components/concepts/GuideHistory';
    import {
        getConceptFromURL,
        getEnumFromURL,
        getQueryFromURL,
        PARAM_PURPOSE,
        PARAM_SECTION,
        setConceptInURL,
        setEnumInURL,
        setQueryInURL,
    } from '@concepts/ConceptParams';
    import { Purpose } from '@concepts/Purpose';
    import { DOCUMENTATION_SYMBOL } from '@parser/Symbols';
    import { blocks, HowTos, Locales, locales } from '@db/Database';
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
    const sectionFallback = () => ($blocks ? 'language' : 'howto');
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

    let mounted = $state(false);
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

    const user = getUser();

    let index = $derived(
        ConceptIndex.make(
            project,
            $locales,
            howTos instanceof Promise ? [] : howTos,
            user ? HowTos.allAccessiblePublishedHowTos : [],
        ),
    );

    // svelte-ignore state_referenced_locally
    let indexStore = $state({ index });
    setConceptIndex(indexStore);

    $effect(() => {
        indexStore.index = index;
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
        // Empty only before mount (path starts empty); afterwards the bottom is a section.
        if ($path.length === 0) return [];
        // The bottom of the history is always the section the Guide crumb names (and pops
        // back to). Language sections add their subsection (purpose), e.g. "code — pattern";
        // how-to sections have no subsection.
        const section = $path[0];
        const header = $locales.getPlainText((l) => l.ui.page.guide.header);
        let label = header;
        if (section.kind === 'section') {
            const mode = $locales.getPlainText((l) =>
                section.mode === 'howto'
                    ? l.ui.docs.mode.browse.labels[1]
                    : l.ui.docs.mode.browse.labels[0],
            );
            label =
                section.mode === 'howto'
                    ? `${header} — ${mode}`
                    : `${header} — ${mode} — ${$locales.getPlainText(
                          (l) => l.ui.docs.purposes[section.purpose].header,
                      )}`;
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

<section class="guide">
    <div class="header">
        <PageHeader
            {extra}
            header={(l) => l.ui.page.guide.header}
            description={(l) => l.ui.page.guide.description}
        />
    </div>

    <Documentation
        {project}
        standalone
        collapse={false}
        bind:query={searchQuery}
        bind:mode={guideSection}
        bind:purpose={guidePurpose}
    ></Documentation>
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
    }

    .header {
        padding: calc(2 * var(--wordplay-spacing));
    }
</style>
