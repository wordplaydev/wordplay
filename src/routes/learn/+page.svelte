<script lang="ts">
    import TutorialView from '@components/app/TutorialView.svelte';
    import Progress from '../../tutorial/Progress';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { creator } from '../../db/Creator';
    import Page from '@components/app/Page.svelte';
    import type { Tutorial } from '../../locale/Locale';
    import { onMount } from 'svelte';
    import Loading from '../../components/app/Loading.svelte';

    let tutorial: Tutorial | undefined | null = undefined;

    $: language = $creator.getLocale().language;

    onMount(async () => {
        try {
            // Load the locale's tutorial
            const response = await fetch(
                `/locales/${language}/${language}-tutorial.json`
            );
            tutorial = await response.json();
        } catch (err) {
            // Couldn't load it? Show an error.
            tutorial = null;
        }
    });

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
            $creator.setTutorialProgress(
                new Progress(
                    tutorial,
                    parseInt(act),
                    parseInt(scene),
                    parseInt(pause)
                )
            );
    }

    function navigate(newProgress: Progress) {
        $creator.setTutorialProgress(newProgress);
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
        {$creator.getLocale().ui.error.tutorial}
    {:else}
        <TutorialView
            progress={$creator.getTutorialProgress(tutorial)}
            {navigate}
        />
    {/if}
</Page>
