<script lang="ts">
    /**
     * The camera, live, and a button that keeps one picture of it (#560).
     *
     * A `CameraFeed` rather than a `MediaStream` of its own: the stream is
     * reference-counted and shared with whatever `Camera` streams the project is
     * already running, so opening this dialog while a program watches the camera
     * costs nothing and turns nothing off. Releasing the handle when this goes away
     * is what turns the camera light off again.
     *
     * The picture is captured at a working size rather than at the grid's, so the
     * crop that follows is sampling from something with detail left in it.
     */
    import Button from '@components/widgets/Button.svelte';
    import Note from '@components/app/Notice.svelte';
    import type { Working } from '@components/app/ImagePicker.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { DB, locales } from '@db/Database';
    import CameraFeed from '@input/CameraFeed';

    interface Props {
        /** What to do with the frame kept. */
        capture: (frame: Working) => void;
    }

    let { capture }: Props = $props();

    /**
     * How big a captured frame is.
     *
     * The same working size `ImagePicker` decodes a file to, so a camera picture and
     * a chosen one are cropped and sampled from the same amount of detail. Null
     * height so the sensor's whole field of view is kept rather than cropped to a
     * square before anyone has said what they want.
     */
    const CaptureWidth = 512;

    /** Fifteen a second is plenty for a viewfinder and half the work of thirty. */
    const Frequency = 15;

    let video: HTMLVideoElement | undefined = $state(undefined);
    let denied = $state(false);
    let ready = $state(false);

    let feed = $state<CameraFeed | undefined>(undefined);

    $effect(() => {
        const started = new CameraFeed(
            DB,
            CaptureWidth,
            null,
            Frequency,
            () => (denied = true),
        );
        started.start();
        feed = started;
        // Polled rather than awaited: the shared source resolves its stream on its
        // own schedule, and there is no event to wait on that is not internal to it.
        const timer = setInterval(() => {
            ready = started.isReady();
            if (started.isFailed()) denied = true;
        }, 100);
        return () => {
            clearInterval(timer);
            started.stop();
            feed = undefined;
        };
    });

    /** Show the shared stream once it exists. Assigning `srcObject` rather than
     *  reusing the shared element, which other consumers are decoding from. */
    $effect(() => {
        if (video === undefined || feed === undefined || !ready) return;
        const shared = feed.getVideoElement();
        const element = video;
        if (shared?.srcObject instanceof MediaStream) {
            element.srcObject = shared.srcObject;
            element.play().catch(() => {});
        }
        return () => {
            element.srcObject = null;
        };
    });

    function keep() {
        const frame = feed?.grabImageData();
        if (frame === undefined) return;
        capture({
            data: frame.data,
            width: frame.width,
            height: frame.height,
        });
    }
</script>

<div class="panel-column">
    <MarkupHTMLView markup={(l) => l.ui.source.add.camera.instructions} />
    {#if denied}
        <Note text={(l) => l.ui.source.add.camera.denied} />
    {:else}
        <!-- svelte-ignore a11y_media_has_caption -->
        <!-- A live camera picture has nothing to caption: there is no audio track
             and no recorded content. The label says what it is. -->
        <video
            bind:this={video}
            class="feed"
            autoplay
            muted
            playsinline
            aria-label={$locales.getPrimaryPlainText(
                (l) => l.ui.source.add.camera.feed,
            )}
        ></video>
        <Button
            background
            active={ready}
            tip={(l) => l.ui.source.add.camera.capture.tip}
            action={keep}
            icon="📷"
            label={(l) => l.ui.source.add.camera.capture.label}
        />
        {#if !ready}
            <Note text={(l) => l.ui.source.add.camera.starting} />
        {/if}
    {/if}
</div>

<style>
    .feed {
        inline-size: 100%;
        max-inline-size: 20em;
        block-size: auto;
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-inactive-color);
    }
</style>
