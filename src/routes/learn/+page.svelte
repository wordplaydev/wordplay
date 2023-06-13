<script lang="ts">
    import TutorialView from '@components/app/TutorialView.svelte';
    import Progress from '../../tutorial/Progress';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { creator } from '../../db/Creator';

    // Set the tutorial based on the preferred locale.
    $: tutorial = $creator.getLocale().tutorial;
    // Set progress if URL indicates one.
    $: {
        // Figure out where we are in the tutorial.
        const act = $page.url.searchParams.get('act');
        const scene = $page.url.searchParams.get('scene');
        const pause = $page.url.searchParams.get('pause');
        if (
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

<TutorialView progress={$creator.getTutorialProgress(tutorial)} {navigate} />
