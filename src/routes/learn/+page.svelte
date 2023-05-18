<script lang="ts">
    import TutorialView from '@components/app/TutorialView.svelte';
    import Progress from '../../tutorial/Progress';
    import { getTutorial } from '../../tutorial/Tutorial';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { creator } from '../../db/Creator';

    // Set the tutorial based on the preferred locale.
    $: tutorial = getTutorial($creator.getLocale());
    // Set progress if URL indicates one.
    $: {
        // Figure out where we are in the tutorial.
        const unit = $page.url.searchParams.get('unit');
        const lesson = $page.url.searchParams.get('lesson');
        const step = $page.url.searchParams.get('step');
        if (
            unit !== null &&
            lesson !== null &&
            isFinite(parseInt(lesson)) &&
            step !== null &&
            isFinite(parseInt(step))
        )
            $creator.setTutorialProgress(
                new Progress(
                    $creator.getLocale().tutorial.units,
                    tutorial,
                    unit,
                    parseInt(lesson),
                    parseInt(step)
                )
            );
    }

    function navigate(newProgress: Progress) {
        $creator.setTutorialProgress(newProgress);
        // Set the URL to mirror the progress, if not at it.
        goto(
            `/learn?unit=${newProgress.unit}&lesson=${newProgress.lesson}&step=${newProgress.step}`
        );
    }
</script>

<TutorialView progress={$creator.getTutorialProgress(tutorial)} {navigate} />
