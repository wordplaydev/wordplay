<script lang="ts">
    import TutorialView from '@components/app/TutorialView.svelte';
    import Progress from '../../tutorial/Progress';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { config } from '../../db/Database';
    import { onMount } from 'svelte';
    import Loading from '@components/app/Loading.svelte';
    import type Tutorial from '../../tutorial/Tutorial';
    import Page from '@components/app/Page.svelte';
    import { toLocaleString } from '../../locale/Locale';

    let tutorial: Tutorial | undefined | null = undefined;

    $: locale = toLocaleString($config.getLocale());

    async function loadTutorial() {
        try {
            // Load the locale's tutorial
            const response = await fetch(
                `/locales/${locale}/${locale}-tutorial.json`
            );
            tutorial = await response.json();
        } catch (err) {
            // Couldn't load it? Show an error.
            tutorial = null;
        }
    }

    onMount(async () => {
        loadTutorial();
    });

    // If hot module reloading, and there's a locale update, refresh the tutorial.
    if (import.meta.hot) {
        import.meta.hot.on('locales-update', () => {
            loadTutorial();
        });
    }

    // Set progress if URL indicates one.
    $: {
        // Figure out where we are in the tutorial.
        const act = $page.url.searchParams.get('act');
        const scene = $page.url.searchParams.get('scene');
        const pause = $page.url.searchParams.get('pause');
        if (
            tutorial &&
            act !== null &&
            isFinite(parseInt(act)) &&
            scene !== null &&
            isFinite(parseInt(scene)) &&
            pause !== null &&
            isFinite(parseInt(pause))
        )
            $config.setTutorialProgress(
                new Progress(
                    tutorial,
                    parseInt(act),
                    parseInt(scene),
                    parseInt(pause)
                )
            );
    }

    function navigate(newProgress: Progress) {
        $config.setTutorialProgress(newProgress);
        // Set the URL to mirror the progress, if not at it.
        goto(
            `/learn?act=${newProgress.act}&scene=${newProgress.scene}&pause=${newProgress.pause}`
        );
    }
</script>

<Page>
    {#if tutorial === undefined}
        <Loading />
    {:else if tutorial === null}
        {$config.getLocale().ui.error.tutorial}
    {:else}
        <TutorialView
            progress={$config.getTutorialProgress(tutorial)}
            {navigate}
        />
    {/if}
</Page>
