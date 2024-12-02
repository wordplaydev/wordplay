<script lang="ts">
    import TutorialView from '@components/app/TutorialView.svelte';
    import Progress from '../../tutorial/Progress';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import {
        Locales,
        Settings,
        locales,
        tutorialProgress,
    } from '../../db/Database';
    import Loading from '@components/app/Loading.svelte';
    import Page from '@components/app/Page.svelte';
    import Speech from '../../components/lore/Speech.svelte';
    import Link from '../../components/app/Link.svelte';
    import Glyphs from '../../lore/Glyphs';
    import Writing from '../../components/app/Writing.svelte';
    import Header from '../../components/app/Header.svelte';
    import type Tutorial from '../../tutorial/Tutorial';
    import { browser } from '$app/environment';
    import { untrack } from 'svelte';

    let tutorial: Tutorial | undefined | null = $state(undefined);

    /** Load the tutorial when locales change. */
    $effect(() => {
        if (browser && $locales) {
            Locales.getTutorial(
                $locales.get((l) => l.language),
                $locales.get((l) => l.region),
            ).then((t) => (tutorial = t));
        }
    });

    // If hot module reloading, and there's a locale update, refresh the tutorial.
    if (import.meta.hot) {
        import.meta.hot.on('locales-update', async () => {
            tutorial = await Locales.getTutorial(
                $locales.get((l) => l.language),
                $locales.get((l) => l.region),
            );
        });
    }

    // Set progress if URL indicates one.
    let initial: Progress | undefined = $state(undefined);

    // Save tutorial projects with projects changes.
    $effect(() => {
        if (tutorial) {
            initial = Progress.fromURL(tutorial, $page.url.searchParams);
            // Untack, since the below reads and sets
            untrack(() => {
                if (initial) Settings.setTutorialProgress(initial);
            });
        }
    });

    function navigate(newProgress: Progress) {
        initial = undefined;
        Settings.setTutorialProgress(newProgress);
        // Set the URL to mirror the progress, if not at it.
        goto(newProgress.getURL());
    }
</script>

{#if tutorial === undefined}
    <Page>
        <Loading />
    </Page>
{:else if tutorial === null}
    <Writing>
        <Header>:(</Header>
        <Speech glyph={Glyphs.Function}
            >{#snippet content()}
                <p>
                    {$locales.get((l) => l.ui.page.learn.error)}
                    <Link to="/">🏠</Link></p
                >
            {/snippet}</Speech
        ></Writing
    >
{:else}
    <Page>
        <TutorialView
            progress={initial ??
                new Progress(
                    tutorial,
                    $tutorialProgress.act,
                    $tutorialProgress.scene,
                    $tutorialProgress.line,
                )}
            {navigate}
            fallback={$locales
                .getLanguages()
                .some((lang) => tutorial?.language === lang) === false}
        />
    </Page>
{/if}
