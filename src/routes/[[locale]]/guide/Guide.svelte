<script lang="ts">
    import { browser } from '$app/environment';
    import { afterNavigate } from '$app/navigation';
    import { page } from '$app/state';
    import Header from '@components/app/Header.svelte';
    import Documentation, {
        Modes,
    } from '@components/concepts/Documentation.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        getUser,
        setConceptIndex,
        setConceptPath,
        setProject,
    } from '@components/project/Contexts';
    import type Concept from '@concepts/Concept';
    import ConceptIndex from '@concepts/ConceptIndex';
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
    let searchQuery = $state(getQueryFromURL(page.url.searchParams));
    const debouncedSearch = debounced(() => searchQuery, 400);

    // The browsing location (section + code subsection), restored from the URL
    // and two-way bound to Documentation, so a refresh/share keeps the location.
    const sectionFallback = () => ($blocks ? 'language' : 'howto');
    let guideSection = $state(
        getEnumFromURL(
            page.url.searchParams,
            PARAM_SECTION,
            Modes,
            sectionFallback(),
        ),
    );
    let guidePurpose = $state(
        getEnumFromURL(
            page.url.searchParams,
            PARAM_PURPOSE,
            Object.values(Purpose),
            Purpose.Outputs,
        ),
    );

    // Create a concept path for children, initialized
    let path = writable<Concept[]>([]);
    setConceptPath(path);

    let mounted = $state(false);
    onMount(() => {
        // Before showing, wait for how tos to load.
        Locales.loadHowTos($locales.getLocaleString()).then(() => {
            concept = getConceptFromURL(index, page.url.searchParams);
            path.set(concept ? [concept] : []);
            mounted = true;
        });
    });

    // After any navigation, extract the concept from the URL and
    // ensure the concept path is set to match it.
    afterNavigate(({ type }) => {
        // Restore the search query from the URL only on back/forward. Our own
        // (debounced) URL writes already reflect the current query, and restoring
        // then could clobber an in-flight change.
        if (type === 'popstate') {
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
        }

        concept = getConceptFromURL(index, page.url.searchParams);
        // Only update the path if the concept exists and is not already in the path.
        if (
            concept !== undefined &&
            ($path.length === 0 ||
                concept.getCharacterName($locales) !==
                    $path.at(-1)?.getCharacterName($locales))
        ) {
            path.set([concept]);
        }
        // Only update if the path isn't already empty.
        else if (!concept) {
            path.set([]);
        }
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
        concept = $path.at(-1);
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
                });
            }
        }
    });
</script>

<section class="guide">
    <div class="header">
        <Header block={false} text={(l) => l.ui.page.guide.header} />
        <MarkupHTMLView markup={(l) => l.ui.page.guide.description} />
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
