<script lang="ts">
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import Loading from '@components/app/Loading.svelte';
    import Page from '@components/app/Page.svelte';
    import TutorialView from '@components/app/TutorialView.svelte';
    import TutorialChooser from '@components/app/TutorialChooser.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { onMount, untrack } from 'svelte';
    import { fade } from 'svelte/transition';
    import PageHeader from '@components/app/PageHeader.svelte';
    import Link from '@components/app/Link.svelte';
    import Writing from '@components/app/Writing.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import {
        Locales,
        Settings,
        locales,
        tutorialState,
        tutorialMode,
        animationDuration,
    } from '@db/Database';
    import { DefaultProgress } from '@db/settings/TutorialProgressSetting';
    import { HOME_SYMBOL } from '@parser/Symbols';
    import Characters from '../../../lore/BasisCharacters';
    import Progress from '../../../tutorial/Progress';
    import type Tutorial from '../../../tutorial/Tutorial';
    import {
        DEFAULT_TUTORIAL_MODE,
        parseTutorialMode,
        type TutorialMode,
    } from '../../../tutorial/TutorialMode';

    // Don't decide what to render until settings have loaded on the client. Settings load
    // synchronously from localStorage in the browser, but SSR/first paint sees defaults, so
    // gating on this avoids flashing the chooser before the saved mode/progress are known.
    let ready = $state(false);
    onMount(() => (ready = true));

    // The active mode: an explicit ?tutorial= parameter wins, otherwise the saved choice.
    // When both are absent it's null, which shows the choice dialog.
    let mode = $derived(
        parseTutorialMode(page.url.searchParams.get('tutorial')) ??
            $tutorialMode,
    );

    // The saved progress for the active mode (each mode remembers its own place).
    let saved = $derived(
        (mode ? $tutorialState.progress[mode] : undefined) ?? DefaultProgress,
    );

    let tutorial: Tutorial | undefined | null = $state(undefined);

    // Set progress if URL indicates one.
    let initial: Progress | undefined = $state(undefined);

    /** Load the tutorial when locales or mode change. */
    $effect(() => {
        if (browser && $locales && mode) {
            Locales.getTutorial(
                $locales.getLocale().language,
                $locales.getLocale().regions,
                mode,
            ).then((t) => {
                tutorial = t;
                if (initial && tutorial) {
                    navigate(
                        new Progress(
                            tutorial,
                            initial.act,
                            initial.scene,
                            initial.pause,
                            mode,
                        ),
                    );
                }
            });
        }
    });

    // If hot module reloading, and there's a locale update, refresh the tutorial. Pass refresh=true
    // to bypass the tutorial cache so edits to the tutorial JSON show up on save.
    if (import.meta.hot) {
        import.meta.hot.on('locales-update', async () => {
            tutorial = await Locales.getTutorial(
                $locales.getLocale().language,
                $locales.getLocale().regions,
                mode ?? DEFAULT_TUTORIAL_MODE,
                true,
            );
        });
    }

    // Save tutorial progress with tutorial changes.
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

    /** Persist the chosen mode and navigate so the page reactively loads the right tutorial. */
    function choose(chosen: TutorialMode) {
        Settings.setTutorialMode(chosen);
        // The default mode keeps the canonical /learn URL; others carry the mode parameter.
        goto(
            chosen === DEFAULT_TUTORIAL_MODE
                ? '/learn'
                : `/learn?tutorial=${chosen}`,
            { keepFocus: true },
        );
    }
</script>

{#if !ready}
    <Page>
        <Loading />
    </Page>
{:else if mode === null}
    <Page>
        <TutorialChooser onChoose={choose} onGuide={() => goto('/guide')} />
    </Page>
{:else if tutorial === undefined}
    <div class="fading" out:fade={{ duration: $animationDuration }}>
        <Page>
            <Loading />
        </Page>
    </div>
{:else if tutorial === null}
    <Writing>
        <PageHeader>{#snippet title()}:({/snippet}</PageHeader>
        <Speech character={Characters.FunctionDefinition}
            >{#snippet content()}
                <MarkupHTMLView markup={(l) => l.ui.page.learn.error} />
                <Link to="/">{HOME_SYMBOL}</Link>
            {/snippet}</Speech
        ></Writing
    >
{:else}
    <div class="fading" in:fade={{ duration: $animationDuration }}>
        <Page>
            <TutorialView
                progress={initial && initial.mode === mode
                    ? initial
                    : new Progress(
                          tutorial,
                          saved.act,
                          saved.scene,
                          saved.line,
                          mode,
                      )}
                {navigate}
                fallback={$locales
                    .getLanguages()
                    .some((lang) => tutorial?.language === lang) === false}
            />
        </Page>
    </div>
{/if}

<style>
    /* Fill the page so the loading/tutorial crossfade overlaps in place. */
    .fading {
        position: absolute;
        inset: 0;
    }
</style>
