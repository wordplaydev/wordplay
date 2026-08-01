<script lang="ts">
    import { animationFactor, locales, musicVisualization } from '@db/Database';
    import { getColorCSS, PX_PER_METER, toOutputTransform } from '@output/Output/outputToCSS';
    import type Music from '@output/Music/Music';
    import type Place from '@output/Place/Place';
    import type RenderContext from '@output/RenderContext';
    import { musicActivity } from '@output/Music/activity';
    import { Instruments, type InstrumentKey } from '@output/Music/instruments';

    interface Props {
        music: Music;
        place: Place;
        focus: Place;
        interactive: boolean;
        parentAscent: number;
        context: RenderContext;
        editable: boolean;
        inspectable?: boolean;
        editing: boolean;
        frame: number;
        flat?: boolean;
    }

    let {
        music,
        place,
        focus,
        interactive,
        parentAscent,
        context,
        editing,
        flat = false,
    }: Props = $props();

    let visible = $derived(flat || place.z > focus.z);

    // The orchestra rendering clusters tracks by instrument, always: a flat
    // row of columns hides the case where several tracks share one
    // instrument, which is exactly what clustering has to make visible.
    let clusters = $derived(
        music.getInstruments().map((instrument) => ({
            instrument,
            tracks: music.tracks
                .map((track, index) => ({ track, index }))
                .filter((entry) => entry.track.instrument.id === instrument),
        })),
    );

    let activity = $derived($musicActivity.get(music.getName()) ?? []);

    /** The strongest strike for a track right now, or undefined if silent. */
    function strikeFor(trackIndex: number) {
        let strongest: (typeof activity)[number] | undefined = undefined;
        for (const entry of activity)
            if (
                entry.track === trackIndex &&
                (strongest === undefined || entry.level > strongest.level)
            )
                strongest = entry;
        return strongest;
    }

    let layout = $derived(music.getLayout(context));
    let width = $derived(layout.width * PX_PER_METER);
    let height = $derived(layout.height * PX_PER_METER);

    // At reduced motion the rendering stops moving but keeps changing: for a
    // Deaf viewer the motion is the content, so damping it to zero would
    // remove the music, but sustained pulsing is what the setting exists to
    // prevent. Color and brightness carry it instead.
    let moving = $derived($animationFactor > 0);

    let description = $derived(
        music.description?.text ?? music.getDescription($locales),
    );
</script>

{#if visible && $musicVisualization === 'orchestra'}
    <div
        class="output music"
        role="img"
        aria-label={description}
        data-id={music.getHTMLID()}
        data-node-id={music.value.creator.id}
        data-name={music.getName()}
        style:width="{width}px"
        style:height="{height}px"
        style:color={getColorCSS(music.getFirstRestPose(), music.pose)}
        style:transform={toOutputTransform(
            music.getFirstRestPose(),
            music.pose,
            place,
            focus,
            parentAscent,
            { width, height, ascent: height, descent: 0 },
            undefined,
            flat,
        )}
        class:editing
        class:interactive
    >
        {#each clusters as cluster (cluster.instrument)}
            {@const hue =
                Instruments[cluster.instrument as InstrumentKey]?.hue ?? 200}
            <div class="cluster" style:--hue={hue}>
                {#each cluster.tracks as entry (entry.index)}
                    {@const strike = strikeFor(entry.index)}
                    {@const level = strike?.level ?? 0}
                    <div
                        class="track"
                        class:sounding={strike !== undefined}
                        class:still={!moving}
                        style:--level={level}
                        style:--degree={strike?.degree ?? 1}
                        style:--pan={entry.track.pan}
                    >
                        <div class="mark"></div>
                    </div>
                {/each}
            </div>
        {/each}
    </div>
{/if}

<style>
    .music {
        position: absolute;
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        justify-content: center;
        gap: 0.4em;
        pointer-events: none;
    }

    .cluster {
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        gap: 0.15em;
        /* A cluster is one visual group, so several tracks of one instrument
           read as related rather than as separate instruments. */
        padding: 0.15em;
        border-radius: 0.3em;
        background: lch(50% 12 calc(var(--hue) * 1deg) / 12%);
    }

    .track {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        width: 0.9em;
        height: 100%;
        /* Pan places the column horizontally within its cluster. */
        transform: translateX(calc(var(--pan) * 0.4em));
    }

    .mark {
        width: 100%;
        /* Volume is size, and the degree lifts the mark, so a rising melody
           rises. Both are clamped so an extreme degree stays on stage. */
        height: calc(0.25em + (var(--level) * 1.2em));
        margin-bottom: calc(
            min(max(var(--degree), 0), 16) * 0.35em
        );
        border-radius: 0.15em;
        background: lch(
            calc(45% + (var(--level) * 40%)) calc(20 + (var(--level) * 70))
                calc(var(--hue) * 1deg)
        );
        opacity: calc(0.35 + (var(--level) * 0.65));
        transition:
            height calc(var(--animation-factor) * 120ms) ease-out,
            margin-bottom calc(var(--animation-factor) * 120ms) ease-out,
            background-color calc(var(--animation-factor) * 160ms) ease-out,
            opacity 160ms ease-out;
    }

    /* At reduced motion, nothing moves: only brightness and color step. */
    .track.still .mark {
        height: 0.6em;
        margin-bottom: 0;
        transition:
            background-color 160ms ease-out,
            opacity 160ms ease-out;
    }
</style>
