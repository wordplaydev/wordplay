<!--
    The landing page's stage: the lockup a visitor arrives to, and the carousel
    they get when they ask for it.

    At rest this is the share card made live — the logo, the wordmark, the
    tagline, and the cast of input streams and output types drifting behind them
    and bouncing off. Pressing the button fades that out and loads the runtime,
    which is deliberately not downloaded before then; see showcase.ts.
-->
<script lang="ts">
    import Logo from '@components/app/Logo.svelte';
    import StageCast from '@components/app/StageCast.svelte';
    import { loadShowcase } from '@components/app/showcase';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import { animationFactor } from '@db/Database';
    import type { Component } from 'svelte';

    interface Props {
        /** The glyph the logo is currently saying, cycled by the page. */
        glyph: string;
        /**
         * How far the handover has got. Bindable so the page can fade out the
         * parts of itself that only make sense before the examples — they leave
         * on the same ramp as the lockup rather than blinking out from under it.
         * Back to `'idle'` if the runtime never arrives.
         */
        phase?: 'idle' | 'leaving' | 'showing';
    }

    let { glyph, phase = $bindable('idle') }: Props = $props();

    /** The lockup, handed to the cast so characters bounce off it. */
    let lockup: HTMLElement | undefined = $state();

    let showcase: Component | undefined = $state();
    let loading = $state(false);
    let failed = $state(false);

    /** The lockup fades out while the runtime arrives, and the examples fade in
     *  behind it, so the stage hands over rather than blinking. Held long enough
     *  for the fade to finish even when the chunk is already cached — and skipped
     *  entirely at factor 0, where there is no fade to wait for. */
    let handingOver = $state(false);

    const FadeSeconds = 0.4;

    async function play() {
        if (loading || showcase) return;
        loading = true;
        failed = false;
        handingOver = $animationFactor > 0;
        phase = handingOver ? 'leaving' : 'showing';
        try {
            const [component] = await Promise.all([
                loadShowcase(),
                handingOver
                    ? new Promise((resolve) =>
                          setTimeout(
                              resolve,
                              FadeSeconds * 1000 * $animationFactor,
                          ),
                      )
                    : Promise.resolve(),
            ]);
            showcase = component;
            phase = 'showing';
        } catch {
            // retryableLoad drops its memo on rejection, so pressing again
            // genuinely retries rather than replaying the failure.
            failed = true;
            phase = 'idle';
        } finally {
            loading = false;
            handingOver = false;
        }
    }
</script>

<div class="stage" class:playing={showcase !== undefined}>
    <!-- The name stays. Everything around it — the cast, the tagline, the
         button — fades, and the examples come up underneath, so the stage looks
         like it made room rather than like it was replaced. -->
    <div
        class="lockup"
        class:compact={showcase !== undefined}
        bind:this={lockup}
    >
        <h1>
            <span class="mark"><Logo {glyph} size="1em" /></span><LocalizedText
                path={(l) => l.glossary.wordplay.word}
            />
        </h1>
        {#if showcase === undefined}
            <p class="tagline curtain" class:leaving={handingOver}>
                <LocalizedText path={(l) => l.ui.page.landing.tagline} />
            </p>
        {/if}
    </div>
    {#if showcase === undefined}
        <div class="curtain cast" class:leaving={handingOver}>
            <StageCast {lockup} />
        </div>
        <div class="play curtain" class:leaving={handingOver}>
            <Button
                background
                tip={(l) => l.ui.page.landing.tour.button}
                action={play}
                large
            >
                {#if loading}<Spinning
                        label={(l) => l.ui.page.landing.tour.loading}
                    />{:else}<LocalizedText
                        path={(l) => l.ui.page.landing.tour.button}
                    />{/if}
            </Button>
            {#if failed}
                <p class="failed" role="alert">
                    <LocalizedText
                        path={(l) => l.ui.page.landing.tour.failed}
                    />
                </p>
            {/if}
        </div>
    {:else}
        {@const Showcase = showcase}
        <div class="entrance"><Showcase /></div>
    {/if}
</div>

<style>
    .stage {
        position: relative;
        container-type: inline-size;
        width: 100%;
        /* Sized in `em`, not viewport units and not a percentage. The app shell
           is pinned (see app.html), so `vh`/`dvh` are neither this box nor
           stable on iOS; and every ancestor here is auto-height, so a
           percentage would silently resolve to `auto` and let the stage grow to
           whatever its content wanted — which is exactly what it did. */
        height: 22em;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--wordplay-spacing);
        overflow: hidden;
    }

    .stage.playing {
        /* The carousel needs room for its buttons, the stage, and the code
           beside it — plus the name still above it — but not so much that what
           follows is pushed off a laptop screen. */
        height: 30em;
        justify-content: flex-start;
        /* A measure, and air at the edges: full-bleed left the examples with
           nothing between them and the window. */
        max-width: 64em;
        margin-inline: auto;
        padding-inline: var(--wordplay-spacing);
        padding-block-end: var(--wordplay-spacing);
        box-sizing: border-box;
    }

    /* Once the code sits below the output rather than beside it, a fixed height
       has to hold both, and no height holds both on a phone: the code ended up
       a two-line slot with its first line cut off. Let the section grow to its
       content instead and let the page scroll, which is what a phone does
       anyway. */
    @container (max-width: 900px) {
        .stage.playing {
            height: auto;
        }
    }

    @container (max-width: 700px) {
        .stage {
            height: 16em;
        }
    }

    /* The handover: the lockup and its cast fade out while the runtime arrives,
       and the examples fade in. The base style is the settled state, so at
       factor 0 both are simply there and nothing waits on an animation. */
    .curtain {
        transition: opacity calc(var(--animation-factor) * 0.4s) ease-out;
    }

    .curtain.leaving {
        opacity: 0;
    }

    .entrance {
        width: 100%;
        flex: 1;
        min-height: 0;
        animation: stage-entrance calc(var(--animation-factor) * 0.4s) ease-out;
    }

    @keyframes stage-entrance {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .lockup {
        position: relative;
        z-index: 1;
        text-align: center;
        flex-shrink: 0;
    }

    /* Once the examples are up the name steps back to a heading, making room
       for them rather than being replaced by them. */
    .lockup.compact h1 {
        font-size: min(6vw, 28pt);
    }

    h1 {
        font-size: min(12vw, 72pt);
        margin: 0;
        transition: font-size calc(var(--animation-factor) * 0.4s) ease-out;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 0.1em;
    }

    .mark {
        display: inline-block;
    }

    .tagline {
        margin: 0;
        font-size: min(20pt, max(12pt, 3vw));
        color: var(--wordplay-inactive-color);
    }

    .cast {
        position: absolute;
        inset: 0;
    }

    .play {
        position: relative;
        z-index: 1;
        text-align: center;
    }

    .failed {
        margin-block-start: var(--wordplay-spacing-half);
        color: var(--wordplay-error);
    }
</style>
