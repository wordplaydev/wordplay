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
    import { onMount } from 'svelte';
    import Loading from '@components/app/Loading.svelte';
    import Page from '@components/app/Page.svelte';
    import Speech from '../../components/lore/Speech.svelte';
    import Link from '../../components/app/Link.svelte';
    import Glyphs from '../../lore/Glyphs';
    import Writing from '../../components/app/Writing.svelte';
    import Header from '../../components/app/Header.svelte';
    import type Tutorial from '../../tutorial/Tutorial';

    let tutorial: Tutorial | undefined | null = undefined;
    let fallback = false;

    onMount(async () => {
        tutorial = await Locales.getTutorial(
            $locales.get((l) => l.language),
            $locales.get((l) => l.region)
        );
        fallback =
            $locales
                .getLanguages()
                .some((lang) => tutorial?.language === lang) === false;
    });

    // If hot module reloading, and there's a locale update, refresh the tutorial.
    if (import.meta.hot) {
        import.meta.hot.on('locales-update', async () => {
            tutorial = await Locales.getTutorial(
                $locales.get((l) => l.language),
                $locales.get((l) => l.region)
            );
        });
    }

    // Set progress if URL indicates one.
    $: {
        if (tutorial) {
            const progress = Progress.fromURL(tutorial, $page.url.searchParams);
            if (progress) Settings.setTutorialProgress(progress);
        }
    }

    function navigate(newProgress: Progress) {
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
            ><p slot="content">
                {$locales.get((l) => l.ui.page.learn.error)}
                <Link to="/">🏠</Link></p
            ></Speech
        ></Writing
    >
{:else}
    <Page>
        <TutorialView
            progress={new Progress(
                tutorial,
                $tutorialProgress.act,
                $tutorialProgress.scene,
                $tutorialProgress.line
            )}
            {navigate}
            {fallback}
        />
    </Page>
{/if}
