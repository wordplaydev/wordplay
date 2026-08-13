<!-- A caption of what `Say` is speaking, for viewers who can't hear it. The
     little speaker chip this replaces never said what was said, and stayed on
     stage long after the speaking stopped.

     It renders the utterance the speech bus was actually handed rather than the
     `Say`s on stage, so what is shown and what is said cannot diverge: one
     decision, two renderings. The only thing layered on top is how long the
     words linger — see caption.ts. -->
<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import { CaptionHold } from '@components/output/caption';
    import { animationDuration, captionSize } from '@db/Database';
    import { SaySource, speakingNow } from '@output/Speech/speech';
    import { onDestroy } from 'svelte';
    import { fade } from 'svelte/transition';

    let caption = $state<string | undefined>(undefined);
    const hold = new CaptionHold({ show: (text) => (caption = text) });

    // The bus is the single decision: whatever it reports speaking for `Say` is
    // what this shows. Another source holding the voice reads as stopped here,
    // which is what it is — a preempting utterance drops the Say it displaced.
    $effect(() => {
        const now = $speakingNow;
        hold.speaking(now?.source === SaySource ? now.text : undefined);
    });

    onDestroy(() => hold.stop());
</script>

{#if caption !== undefined}
    <!-- Decorative to screen readers: this is the visual rendering of speech a
         screen reader user is already hearing, and `Say` is excluded from the
         stage's descriptions for exactly that reason (OutputDescriptions.ts,
         OutputView.describeValue). Announcing it here would deliver the same
         sentence twice, in two voices. No aria-live either: the Announcer owns
         the app's only live region. -->
    <div
        class="caption"
        data-testid="caption"
        style:--caption-size={$captionSize}
        aria-hidden="true"
        transition:fade|local={{ duration: $animationDuration }}
    >
        <div class="box">
            <span class="icon"><Emoji text="🔊" /></span>
            <span class="text">{caption}</span>
        </div>
    </div>
{/if}

<style>
    /* Positioning belongs to the stage floor band in OutputView, which holds
       this above the key pad so the two can never overlap however tall either
       grows. `.value` clips its overflow and nothing on stage can escape it,
       so the answer to "don't get clipped" is to stay inside it and wrap. */
    .caption {
        display: flex;
        justify-content: center;
        max-inline-size: 100%;
        /* A flex item won't shrink below its content without this, which is
           what makes the cap below bite. */
        min-block-size: 0;
        /* Never more than a slice of the stage, however large the viewer's size
           setting. `12em` alone is the wrong cap once size is a setting: at 3×
           it is most of a phone in landscape. The percentage resolves because
           the band spans the stage and so has a definite height. */
        max-block-size: min(12em, 40%);
    }

    .box {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        /* Literal black and white, not `--color-black`/`--color-white`, which
           flip with the color scheme: this is read over creator output of any
           color, on a stage whose scheme is pinned light, so only a fixed pair
           is legible on both a black stage and a white one (21:1, well past
           AA). Button's `.salient` and app.html's `.highlight-surface` name the
           raw values for the same reason. Fully opaque, or axe can't measure
           the contrast it's sitting on. */
        background: var(--black-light);
        color: var(--white-light);
        font-family: var(--wordplay-app-font);
        /* The app's base size scaled by the viewer's caption setting, not the
           stage's font-size: creator output sets that, and a caption that grew
           with the program's own type would be unreadable in half of them. */
        font-size: calc(var(--wordplay-font-size) * var(--caption-size, 1));
        line-height: 1.3;
        text-align: start;
        /* Selecting text on a touch input surface pops the callout menu over
           the stage, matching the status chips. */
        user-select: none;
        /* Bounded on both axes so a long line wraps into the stage instead of
           running off it. The box grows upward from the floor, so the block cap
           cuts the tail rather than the opening words. */
        max-inline-size: min(
            calc(100% - 2 * var(--wordplay-spacing)),
            40em
        );
        max-block-size: 100%;
        overflow: hidden;
    }

    /* 🔊 is `Say`'s own name in the locale, so the caption is marked with the
       thing that produced it. */
    .icon {
        flex-shrink: 0;
    }

    .text {
        /* The creator's own line breaks are part of what they wrote. */
        white-space: pre-wrap;
        /* A long unbroken run — a URL, or a script with no break opportunities
           — would otherwise push the box past its max width. */
        overflow-wrap: anywhere;
        /* A flex item won't shrink below its content without this, which is
           what makes the wrapping above take effect. */
        min-inline-size: 0;
    }
</style>
