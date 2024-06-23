<script lang="ts">
    import { afterNavigate, goto } from '$app/navigation';
    import { page } from '$app/stores';
    import Header from '@components/app/Header.svelte';
    import Documentation from '@components/concepts/Documentation.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        ConceptIndexSymbol,
        ConceptPathSymbol,
    } from '@components/project/Contexts';
    import type Concept from '@concepts/Concept';
    import ConceptIndex from '@concepts/ConceptIndex';
    import { locales } from '@db/Database';
    import Project from '@models/Project';
    import Source from '@nodes/Source';
    import { setContext } from 'svelte';
    import { writable } from 'svelte/store';

    let locale: string | null = null;
    let concept: string | null = null;

    // There's no actual project; the documentation component just relies on one to have contexts.
    $: project = Project.make(
        null,
        'guide',
        Source.make(''),
        [],
        $locales.getLocales(),
    );

    $: index = ConceptIndex.make(project, $locales);
    let indexStore = writable<ConceptIndex | undefined>(index);
    setContext(ConceptIndexSymbol, indexStore);
    $: indexStore.set(index);

    // Create a concept path for children
    let path = writable<Concept[]>([]);
    setContext(ConceptPathSymbol, path);

    // After any navigation, extract the locale and concept from the URL and
    // ensure the concepts are set to match it.
    afterNavigate(async () => {
        locale =
            $page.url.searchParams.get('locale') ??
            `${$locales.getLocales()[0].language}-${
                $locales.getLocales()[0].region
            }`;
        concept = $page.url.searchParams.get('concept');

        if (concept) {
            const match = index.getConceptByName(concept);
            // Only update the path if the concept exists and is not already in the path.
            if (
                match &&
                ($path.length === 0 ||
                    match.getName($locales, false) !==
                        $path[0].getName($locales, false))
            ) {
                path.set([match]);
            }
        }
        // Only update if the path isn't already empty.
        else if ($path.length !== 0) {
            path.set([]);
        }
    });

    // When the concept path changes, navigate to the corresponding URL.
    $: if ($path) {
        const current = $path.at(-1);
        if (current) {
            concept = current.getName($locales, false);
        } else concept = null;
        const newParams = new URLSearchParams();
        if (locale) newParams.set('locale', locale);
        else newParams.delete('locale');
        if (concept) newParams.set('concept', concept);
        else newParams.delete('concept');
        if (window.location.search !== `?${newParams.toString()}`) {
            goto(`/guide?${newParams.toString()}`);
        }
    }
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
