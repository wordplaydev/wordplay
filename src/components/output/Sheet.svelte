<script lang="ts">
    import { animationFactor } from '@db/Database';
    import type Music from '@output/Music/Music';
    import { signatureOf, type MusicData } from '@output/Music/musicData';
    import { peekMusicPlayer } from '@output/Music/players';
    import {
        absoluteBeat,
        advanceCursor,
        headOf,
        layoutOf,
        marksOf,
        placeStep,
        playheadOf,
        RestStep,
        staffCenterOf,
        staffLines,
        startCursor,
        startHistory,
        TrebleClef,
        windowStart,
        type Layout,
        type Mark,
    } from '@output/Music/sheet';
    import type Evaluator from '@runtime/Evaluator';
    import { onDestroy } from 'svelte';

    interface Props {
        /** The music on this stage; the sheet draws its notes, not just its name. */
        musics: Music[];
        /** Whose player holds the playhead. */
        evaluator: Evaluator;
    }

    let { musics, evaluator }: Props = $props();

    /** Beats built past each edge, so a note is laid out before it scrolls in. */
    const Overscan = 4;

    let datas = $derived(musics.map((music) => music.toData()));
    let signature = $derived(datas.map(signatureOf).join('|'));
    /** Measured, because whether a piece fits depends on how much room there
     * is: the same twenty-six beats are readable across a wide stage and a
     * pile of overlapping noteheads on a narrow one. */
    let width = $state(0);
    let layout: Layout = $derived(layoutOf(datas, width));

    /**
     * What this run has drawn and where each music has reached.
     *
     * Marks are kept rather than rebuilt from scratch because a sound effect's
     * notes exist for a single frame — Chimes hands its bell one degree at the
     * instant a key is struck and is empty again immediately — so a sheet that
     * only drew the present would be blank. What has sounded stays on the staff
     * until it scrolls away.
     */
    let history = startHistory();
    let marks: Mark[] = $state([]);

    /** The run the history belongs to. A restart, an edit, or a locale change
     * all build a new evaluator, and `players.ts` keys its registry by that, so
     * a new evaluator means a new player whose beats begin again at zero — the
     * same comparison, for the same reason, that OutputView makes before it
     * releases the player. */
    let ran: Evaluator | undefined = undefined;

    /** The step the middle staff line represents. Fixed per score rather than
     * per window: recomputing it as notes scroll in and out would slide every
     * note up and down. */
    let center = $state(4);
    let scored = '';

    /**
     * Recompute the vertical range when the score changes.
     *
     * Deliberately does *not* clear what has been seen: a sound effect's notes
     * change the signature on every strike, so clearing here made Chimes blip
     * a notehead and lose it a frame later. History outlives the score it came
     * from and is pruned by the window instead.
     */
    function rescore() {
        scored = signature;
        const whole = datas.flatMap((data) =>
            marksOf([data], 0, Math.max(layout.length, layout.beats)),
        );
        if (whole.length > 0) center = staffCenterOf(whole);
    }

    $effect(() => {
        if (signature !== scored) rescore();
    });

    let strip: HTMLElement | undefined = $state(undefined);
    let region: HTMLElement | undefined = $state(undefined);
    let frame: number | undefined = undefined;

    /** Absolute beat of each music, forward-only across restarts. */
    function positionOf(data: MusicData, beat: number): number {
        const cursor = advanceCursor(
            history.cursors.get(data.name) ?? startCursor(),
            beat,
        );
        history.cursors.set(data.name, cursor);
        return absoluteBeat(cursor);
    }

    $effect(() => {
        const paging = $animationFactor === 0;
        const step = () => {
            // A fresh run starts a fresh sheet. Checked here rather than in an
            // effect so it lands before any position is read this frame.
            if (ran !== evaluator) {
                ran = evaluator;
                history = startHistory();
                marks = [];
            }

            // Never `acquire` — a decoration must not be the reason an
            // AudioContext exists.
            const player = peekMusicPlayer(evaluator);
            const positions = player?.positions();
            // Stepping back through evaluation history walks the playhead back
            // over notes already on the staff. The cursor is deliberately not
            // consulted for this: it reads a backwards beat as a re-trigger and
            // pushes the origin forward, which is right for a chime struck
            // twice and exactly wrong for going back in time.
            const rewound = evaluator.isInPast()
                ? player?.positionsAt(evaluator.getStepIndex())
                : undefined;

            let furthest = 0;
            const built: Mark[] = [];
            for (const data of datas) {
                // A music the player isn't reporting has no position, so don't
                // move its cursor: reading a missing beat as zero would look
                // like a rewind and push its origin forward for nothing.
                const playing = positions?.get(data.name);
                const raw = playing?.beat ?? 0;
                const origin =
                    playing === undefined
                        ? absoluteBeat(
                              history.cursors.get(data.name) ?? startCursor(),
                          )
                        : positionOf(data, raw) - raw;
                const back = rewound?.get(data.name);
                const here = origin + (back ?? raw);
                furthest = Math.max(furthest, here);
                // Build in the music's own beats, then shift onto the sheet's
                // axis, so a restart moves a music along rather than resetting.
                const from = windowStart(layout, here) - origin;
                for (const mark of marksOf(
                    [data],
                    from - Overscan,
                    from + layout.beats + Overscan,
                ))
                    built.push({
                        ...mark,
                        id: `${origin} ${mark.id}`,
                        beat: mark.beat + origin,
                    });
            }

            // A score that has played its last note stops here rather than
            // scrolling on into empty staff — but "played its last note"
            // includes what a re-triggered sound effect has left behind, or a
            // chime struck twice would freeze after the first.
            let end = layout.length;
            for (const mark of history.seen.values())
                end = Math.max(end, mark.beat + mark.beats);
            for (const mark of built)
                end = Math.max(end, mark.beat + mark.beats);
            const head = headOf(layout, furthest, end);

            // Merge what is playing with what has played, then forget what has
            // scrolled off, so the list stays the size of the window.
            const start = windowStart(layout, head) - Overscan;
            for (const mark of built) history.seen.set(mark.id, mark);
            for (const [id, mark] of history.seen)
                if (mark.beat + mark.beats < start) history.seen.delete(id);

            const next = [...history.seen.values()].sort(
                (a, b) => a.beat - b.beat,
            );
            if (next.length !== marks.length) marks = next;
            else
                for (let i = 0; i < next.length; i++)
                    if (next[i].id !== marks[i].id) {
                        marks = next;
                        break;
                    }

            const measured = region?.clientWidth ?? 0;
            if (measured !== width) width = measured;
            // Sized from the band rather than inherited from the stage, whose
            // font is set for the creator's output and can be enormous.
            const tall = region?.clientHeight ?? 0;
            if (region !== undefined)
                region.style.setProperty('--note', `${tall / 5}px`);
            const perBeat = layout.beats > 0 ? measured / layout.beats : 0;
            // A fitted loop draws one pass and sweeps it again; a scrolling
            // piece slides under a playhead a third of the way in.
            const shown = playheadOf(layout, head);
            const from = layout.fits
                ? 0
                : paging
                  ? Math.floor(head / layout.beats) * layout.beats
                  : windowStart(layout, head);

            if (region !== undefined) {
                region.style.setProperty('--per-beat', `${perBeat}px`);
                region.style.setProperty(
                    '--playhead',
                    `${(layout.fits ? shown : head - from) * perBeat}px`,
                );
            }
            // Marks are positioned at their absolute beat, so translating the
            // strip is the whole of the scroll — and rebuilding the list never
            // moves anything, which is what used to make it jump.
            if (strip !== undefined)
                strip.style.transform = `translateX(${-from * perBeat}px)`;

            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => {
            if (frame !== undefined) cancelAnimationFrame(frame);
            frame = undefined;
        };
    });

    onDestroy(() => {
        if (frame !== undefined) cancelAnimationFrame(frame);
    });

    /**
     * A mark's height as a percentage down the band.
     *
     * Inset from both edges, because a notehead is placed by its middle and
     * carries its instrument above it: mapping the top of the register to 0%
     * put half of the highest glyph outside the band, where it was clipped.
     */
    const TopInset = 14;
    const BottomInset = 10;

    function heightAt(step: number): number {
        return (
            TopInset + placeStep(step, center) * (100 - TopInset - BottomInset)
        );
    }

    function heightOf(mark: Mark): number {
        return heightAt(mark.step ?? center + RestStep - 3);
    }
</script>

<!-- Decorative: each Music already carries a description for screen readers,
     and a staff says nothing the description doesn't. -->
<div class="sheet" aria-hidden="true" bind:this={region}>
    <!-- Drawn from the same scale as the notes, so a notehead sitting on a
         line really is on that line. Five fixed CSS rules could only agree
         with the pitches by accident. -->
    {#each staffLines(center) as line (line)}
        <div class="line" style:top="{heightAt(line)}%"></div>
    {/each}
    <div class="clef">{TrebleClef}</div>
    <div class="window">
        <div class="strip" bind:this={strip}>
            {#each marks as mark (mark.id)}
                <span
                    class="mark"
                    class:rest={mark.rest}
                    style:--beat={mark.beat}
                    style:top="{heightOf(mark)}%"
                    style:--level={mark.level}
                >
                    {#if mark.accidental}<span class="accidental"
                            >{mark.accidental}</span
                        >{/if}{mark.glyph}<sup>{mark.label}</sup>
                </span>
            {/each}
        </div>
    </div>
    <div class="playhead"></div>
</div>

<style>
    .sheet {
        position: absolute;
        inset-inline: 0;
        bottom: 0;
        /* Tall enough that a wide register has somewhere to go; the notes are
           fitted into it rather than clipped against it. */
        height: 34%;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
        --playhead: 0px;
        --per-beat: 0px;
        --note: 16px;
    }

    /* The staff is the frame; the music is what slides past it. */
    .line {
        position: absolute;
        inset-inline: 0;
        height: 1px;
        background: currentColor;
        opacity: 0.3;
    }

    .clef {
        position: absolute;
        inset-inline-start: 0.1em;
        top: 18%;
        font-size: calc(var(--note) * 1.6);
        line-height: 1;
        opacity: 0.4;
        z-index: 1;
    }

    /**
     * Everything ahead of the playhead is ghosted and everything behind it is
     * solid, done by masking the notes rather than painting a panel over them.
     * A panel dimmed the staff too and read as a rectangle sitting on the
     * stage; a mask changes only the notes' own alpha, and the short ramp is
     * what makes a note *become* solid as it crosses rather than switching.
     *
     * The mask must live on this wrapper and not on the strip: a mask is
     * painted in its own element's coordinates, so putting it on the strip
     * made it slide along with the notes and nothing ever crossed it.
     */
    .window {
        position: absolute;
        inset: 0;
        --edge: calc(var(--playhead) + var(--per-beat) * 0.4);
        mask-image: linear-gradient(
            to right,
            #000 0 var(--playhead),
            rgba(0, 0, 0, 0.25) var(--edge),
            rgba(0, 0, 0, 0.25) 100%
        );
    }

    .strip {
        position: absolute;
        inset: 0;
        will-change: transform;
    }

    /* A notehead is placed by its absolute beat, so the only thing that moves
       is the strip. Its leading edge sits on the beat rather than its centre,
       so the moment the glyph meets the now line is the moment it sounds. */
    .mark {
        position: absolute;
        /* A containing block for the instrument at the stem's tip. */
        display: inline-block;
        left: calc(var(--beat) * var(--per-beat));
        transform: translateY(-50%);
        white-space: nowrap;
        font-size: var(--note);
        line-height: 1;
        /* The two noteheads of a mashed fractional note fade in proportion to
           how loudly each sounds, so the score shows the balance between them
           rather than a chord nobody is playing. */
        opacity: var(--level, 1);
    }

    /* Multiplied rather than replaced, so a rest stays dimmed. */
    .mark.rest {
        opacity: calc(var(--level, 1) * 0.55);
    }

    .accidental {
        font-size: 65%;
        vertical-align: super;
    }

    /* The instrument rides at the tip of the note's stem rather than beside
       it, so it costs no horizontal room — which is what let a dense piece
       crowd itself. */
    .mark sup {
        position: absolute;
        top: -0.35em;
        inset-inline-start: 0.62em;
        font-size: 26%;
        line-height: 1;
        opacity: 0.85;
    }

    /* Where now is. */
    .playhead {
        position: absolute;
        inset-block: 10%;
        inset-inline-start: var(--playhead);
        width: 2px;
        background: currentColor;
        opacity: 0.5;
    }
</style>
