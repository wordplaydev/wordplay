<script lang="ts">
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import Loading from '@components/app/Loading.svelte';
    import Page from '@components/app/Page.svelte';
    import TutorialView from '@components/app/TutorialView.svelte';
    import { untrack } from 'svelte';
    import Header from '../../components/app/Header.svelte';
    import Link from '../../components/app/Link.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import Speech from '../../components/lore/Speech.svelte';
    import {
        Locales,
        Settings,
        locales,
        tutorialProgress,
    } from '../../db/Database';
    import Characters from '../../lore/BasisCharacters';
    import Progress from '../../tutorial/Progress';
    import type Tutorial from '../../tutorial/Tutorial';

    let tutorial: Tutorial | undefined | null = $state(undefined);

    /** Load the tutorial when locales change. */
    $effect(() => {
        if (browser && $locales) {
            Locales.getTutorial(
                $locales.get((l) => l.language),
                $locales.get((l) => l.regions),
            ).then((t) => {
                tutorial = t;
                if (initial && tutorial) {
                    navigate(
                        new Progress(
                            tutorial,
                            initial.act,
                            initial.scene,
                            initial.pause,
                        ),
                    );
                }
            });
        }
    });

    // If hot module reloading, and there's a locale update, refresh the tutorial.
    if (import.meta.hot) {
        import.meta.hot.on('locales-update', async () => {
            tutorial = await Locales.getTutorial(
                $locales.get((l) => l.language),
                $locales.get((l) => l.regions),
            );
        });
    }

    // Set progress if URL indicates one.
    let initial: Progress | undefined = $state(undefined);

    // Save tutorial projects with projects or tutorial changes.
    $effect(() => {
        if (tutorial) {
            // Untrack, as we only want to be dependent on tutorial changes, not page or initial changes.
            untrack(() => {
                if (tutorial) {
                    initial = Progress.fromURL(tutorial, page.url.searchParams);
                    if (initial) Settings.setTutorialProgress(initial);
                }
            });
        }
    });

    async function navigate(newProgress: Progress) {
        // Reset the initial tutorial progress.
        initial = undefined;
        // Navigate to the new tutorial URL.
        await goto(newProgress.getURL(), { keepFocus: true });
        // After navigation, update the tutorial progress.
        Settings.setTutorialProgress(newProgress);
    }
</script>

{#if tutorial === undefined}
    <Page>
        <Loading />
    </Page>
{:else if tutorial === null}
    <Writing>
        <Header>:(</Header>
        <Speech character={Characters.FunctionDefinition}
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
