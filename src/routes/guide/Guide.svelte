<script lang="ts">
    import { browser } from '$app/environment';
    import { afterNavigate, goto } from '$app/navigation';
    import { page } from '$app/state';
    import Header from '@components/app/Header.svelte';
    import Documentation from '@components/concepts/Documentation.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        setConceptIndex,
        setConceptPath,
    } from '@components/project/Contexts';
    import type Concept from '@concepts/Concept';
    import ConceptIndex from '@concepts/ConceptIndex';
    import {
        getConceptFromURL,
        setConceptInURL,
    } from '@concepts/ConceptParams';
    import { locales } from '@db/Database';
    import Project from '@db/projects/Project';
    import { toLocale } from '@locale/LocaleText';
    import Source from '@nodes/Source';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';

    function getLocaleInURL() {
        return (
            page.url.searchParams.get('locale') ??
            toLocale($locales.getLocales()[0])
        );
    }

    // Initialize locale and concept with URL.
    let locale: string | null = $state(null);
    let concept: Concept | undefined = $state(undefined);

    // Create a concept path for children, initialized
    let path = writable<Concept[]>([]);
    setConceptPath(path);

    let mounted = $state(false);
    onMount(() => {
        locale = getLocaleInURL();
        concept = getConceptFromURL(index, page.url.searchParams);

        path.set(concept ? [concept] : []);
        mounted = true;
    });

    // After any navigation, extract the locale and concept from the URL and
    // ensure the concepts are set to match it.
    afterNavigate(() => {
        // Set the current locale.
        locale = getLocaleInURL();
        concept = getConceptFromURL(index, page.url.searchParams);
        // Only update the path if the concept exists and is not already in the path.
        if (
            concept !== undefined &&
            ($path.length === 0 ||
                concept.getName($locales, false) !==
                    $path[0].getName($locales, false))
        ) {
            path.set([concept]);
        }
        // Only update if the path isn't already empty.
        else if (concept === null) {
            path.set([]);
        }
    });

    // There's no actual project; the documentation component just relies on one to have contexts.
    let project = $derived(
        Project.make(null, 'guide', Source.make(''), [], $locales.getLocales()),
    );
    let index = $derived(ConceptIndex.make(project, $locales));
    // svelte-ignore state_referenced_locally
    let indexStore = $state({ index });
    setConceptIndex(indexStore);

    $effect(() => {
        indexStore.index = index;
    });

    $effect(() => {
        concept = $path.at(-1);
    });

    // When the concept path changes, navigate to the corresponding URL.
    $effect(() => {
        if (browser && $path && mounted) {
            const newParams = new URLSearchParams();

            if (locale) newParams.set('locale', locale);
            else newParams.delete('locale');

            setConceptInURL($locales, concept ?? undefined, index, newParams);

            if (window.location.search !== `?${newParams.toString()}`) {
                // If the path was empty, just replace the state, so we can go back.
                goto(`/guide?${newParams.toString()}`, {
                    replaceState: window.location.search === '',
                });
            }
        }
    });
</script>

<section class="guide">
    <div class="header">
        <Header block={false}
            >{$locales.get((l) => l.ui.page.guide.header)}</Header
        >
        <MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.guide.description)}
        />
    </div>

    <Documentation {project} collapse={false}></Documentation>
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
