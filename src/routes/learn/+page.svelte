<script lang="ts">
    import TutorialView from '@components/app/TutorialView.svelte';
    import Progress from '../../tutorial/Progress';
    import { getTutorial } from '../../tutorial/Tutorial';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { creator } from '../../db/Creator';

    // Get the tutorial for the preferred locale
    $: tutorial = getTutorial($creator.getLocale());
    // Create progress based on the current search parameters, and if there are none, the persisted state.
    let progress: Progress;
    $: {
        const unit = $page.url.searchParams.get('unit');
        const lesson = $page.url.searchParams.get('lesson');
        const step = $page.url.searchParams.get('step');
        if (
            unit !== null &&
            lesson !== null &&
            isFinite(parseInt(lesson)) &&
            step !== null &&
            isFinite(parseInt(step))
        ) {
            progress = new Progress(
                tutorial,
                unit,
                parseInt(lesson),
                parseInt(step)
            );
        } else progress = new Progress(tutorial, 'welcome', 0, 0);
    }

    function navigate(newProgress: Progress) {
        progress = newProgress;

        // Set the URL to mirror the progress.
        goto(
            `/learn?unit=${progress.unit}&lesson=${progress.lesson}&step=${progress.step}`
        );
    }
</script>

<TutorialView {progress} {navigate} />
