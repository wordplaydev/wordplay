<script lang="ts">
    import { animationFactor, musicVisualization } from '@db/Database';
    import type Music from '@output/Music/Music';
    import { musicActivity } from '@output/Music/activity';
    import { instrumentSpec } from '@output/Music/instruments';
    import { onDestroy } from 'svelte';

    interface Props {
        /** All the music on this stage; every track gets a bar. */
        musics: Music[];
    }

    let { musics }: Props = $props();

    /** One bar per track, across every music on stage, in source order. */
    let bars = $derived(
        musics.flatMap((music) =>
            music.tracks.map((track, index) => ({
                key: `${music.getName()}-${index}`,
                music: music.getName(),
                index,
                instrument: track.instrument.id,
            })),
        ),
    );

    /**
     * How high each bar stands right now, and how bright.
     *
     * A bar can't just show the level of the last note: every note in a track
     * usually has the same volume, so reading the activity store directly
     * leaves every bar frozen at one height and the meter looks broken. What
     * makes it read as music is the *envelope* — each strike snaps the bar to
     * full and it falls away until the next one, which is what a level meter
     * does and what makes the rhythm visible.
     */
    let heights = $state(new Map<string, number>());
    /** The strike counter each bar was last seen at, to catch a new note even
     * when it is the same loudness as the one before. */
    const seen = new Map<string, number>();

    /** Seconds for a bar to fall to roughly a tenth of its height. */
    const FallSeconds = 0.42;

    let frame: number | undefined = undefined;
    let last: number | undefined = undefined;

    $effect(() => {
        const step = (now: number) => {
            const elapsed = last === undefined ? 0 : (now - last) / 1000;
            last = now;
            const activity = $musicActivity;
            const next = new Map(heights);
            let changed = false;

            for (const bar of bars) {
                // The loudest thing this track is doing this instant.
                let strike: { level: number; strike: number } | undefined =
                    undefined;
                for (const entry of activity.get(bar.music) ?? [])
                    if (
                        entry.track === bar.index &&
                        (strike === undefined || entry.level > strike.level)
                    )
                        strike = entry;

                const current = next.get(bar.key) ?? 0;
                let height = current;
                if (
                    strike !== undefined &&
                    seen.get(bar.key) !== strike.strike
                ) {
                    // A new note, even if it's the same loudness as the last.
                    seen.set(bar.key, strike.strike);
                    height = Math.max(current, strike.level);
                } else {
                    height =
                        current * Math.exp(-elapsed / (FallSeconds / 2.303));
                    if (height < 0.001) height = 0;
                }
                if (height !== current) {
                    next.set(bar.key, height);
                    changed = true;
                }
            }

            if (changed) heights = next;
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => {
            if (frame !== undefined) cancelAnimationFrame(frame);
            frame = undefined;
            last = undefined;
        };
    });

    onDestroy(() => {
        if (frame !== undefined) cancelAnimationFrame(frame);
    });

    // At reduced motion the bars stop moving but keep changing colour and
    // brightness: for a Deaf viewer the motion is the content, so damping it
    // to nothing would remove the music, while sustained pulsing is what the
    // setting exists to prevent.
    let moving = $derived($animationFactor > 0);
</script>

{#if $musicVisualization === 'orchestra' && bars.length > 0}
    <!-- Decorative: each Music already carries a description for screen
         readers, and repeating it per bar would say the same thing many
         times. -->
    <div
        class="music-orchestra"
        aria-hidden="true"
        style:--tracks={bars.length}
    >
        <div class="bars">
            {#each bars as bar (bar.key)}
                {@const spec = instrumentSpec(bar.instrument)}
                {@const level = heights.get(bar.key) ?? 0}
                <div
                    class="track"
                    class:still={!moving}
                    class:sounding={level > 0.02}
                    style:--hue={spec?.hue ?? 200}
                    style:--level={level}
                >
                    <div class="column"><div class="bar"></div></div>
                    <div class="label" title={bar.instrument}>
                        {#if spec?.emoji}{spec.emoji}{:else}<span class="name"
                                >{bar.instrument}</span
                            >{/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    /* Anchored to the floor of the stage and never taller than a sixth of it,
       so the music sits under the creator's output rather than competing with
       it however many tracks are playing. */
    .music-orchestra {
        position: absolute;
        inset-inline: 0;
        bottom: 0;
        height: var(--music-orchestra-height);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        pointer-events: none;
        z-index: 1;
        /* A container so a track can be sized against this band — its width for
           the slot each track gets, its height for the label. Its own size comes
           from the stage rather than from these bars (an explicit height, and
           both inline edges pinned), so there is nothing circular about
           measuring against it. */
        container-type: size;
    }

    .bars {
        /* The width one track gets to itself, gap included. Everything below
           is capped by this, so forty tracks shrink to fit instead of
           overflowing a centred row and being clipped at both ends. */
        --slot: calc(100cqw / var(--tracks));
    }

    .bars {
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        justify-content: center;
        gap: min(0.4em, calc(var(--slot) * 0.12));
        height: 100%;
        max-width: 100%;
        /* A backstop only; the sizes below should already fit. */
        overflow: hidden;
    }

    .track {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        height: 100%;
        min-width: 0;
        /* No track may take more than its share of the width, so the row can
           never total more than the stage however many instruments play. */
        max-width: var(--slot);
    }

    /* The bar grows upward from the label, so the labels stay on one line
       along the floor whatever the music is doing. */
    .column {
        display: flex;
        align-items: flex-end;
        flex: 1;
        min-height: 0;
    }

    /* No CSS transition on height: the envelope above is driving it every
       frame, and a transition would fight it and smear the attack that makes
       the beat visible. */
    .bar {
        width: min(1.2vh, calc(var(--slot) * 0.34));
        min-width: 2px;
        height: calc(6% + (var(--level) * 94%));
        border-radius: 0.15em 0.15em 0 0;
        background: lch(
            calc(42% + (var(--level) * 40%)) calc(20 + (var(--level) * 80))
                calc(var(--hue) * 1deg)
        );
        opacity: calc(0.25 + (var(--level) * 0.75));
    }

    /* At reduced motion nothing moves; the bar holds one height and only its
       colour and brightness carry the music. */
    .track.still .bar {
        height: 45%;
        transition:
            background-color 150ms ease-out,
            opacity 150ms ease-out;
    }

    /* The instrument, named along the floor under its bar, lighting up while
       it plays. */
    .label {
        /* As big as this band allows — these are the only text in the rendering
           and have to be readable from across a classroom — but never taller
           than the room the bar needs above them, and never wider than the
           track's share of the width. An emoji paints a little wider than its
           font size, hence the margin below 1.
           Measured in `cqh` against the band, not `vh` against the viewport:
           the band is a fraction of the *stage*, and on a stage embedded in a
           page — a doc preview, the tutorial, the landing page — a viewport
           height bore no relation to it. At 4.8vh the label came out taller
           than the whole band and squeezed the bars to a few pixels, so the
           music appeared to pulse the instrument rather than the level. */
        font-size: min(40cqh, 3em, calc(var(--slot) * 0.76));
        line-height: 1.2;
        opacity: calc(0.45 + (var(--level) * 0.55));
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 2.4em;
        transition: transform 120ms ease-out;
    }

    .track.sounding:not(.still) .label {
        transform: scale(1.15);
    }

    /* A written-out name needs to be smaller than an emoji to fit the same
       floor space. */
    .name {
        font-size: 0.34em;
    }
</style>
