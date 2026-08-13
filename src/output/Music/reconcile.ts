/**
 * The per-evaluation decision: for each named music, does the player keep
 * going, splice a change in at the next beat, start, restart, drain, or
 * stop? Pure over plain data, because these rules — especially replay's —
 * are the part of the design that must be testable without an ear.
 *
 * **A note that has started plays to its end.** Only `restart` silences one,
 * and only because replaying means starting over; a paused stage is the other
 * cut, and it lives in `MusicPlayer.silence`. Everything else — a changed
 * note list, a music leaving the stage — stops scheduling and lets what is
 * already sounding ring out. This matters because the natural way to write a
 * sound effect is a note list derived from momentary state, empty the rest of
 * the time, and for a while that spelling was cut off a frame after it began.
 */

import { signatureOf, type MusicData } from '@output/Music/musicData';

export type Decision =
    | { kind: 'start'; data: MusicData }
    | { kind: 'keep' }
    /** Replace what comes next; never silences a note already sounding. */
    | { kind: 'splice'; data: MusicData }
    /** Cancel everything sounding and start from the top. */
    | { kind: 'restart'; data: MusicData }
    /** Exited with non-looping tracks unfinished; let them play out. */
    | { kind: 'drain' }
    /** Schedule nothing more; sounding notes still ring out. */
    | { kind: 'stop' };

export type LiveMusic = {
    data: MusicData;
    draining: boolean;
    /** It has played its last note and is still on stage. */
    finished: boolean;
};

/**
 * Decide per name. `replay` is per-evaluation, with no edge detection: two
 * consecutive evaluations each delivering ⊤ restart twice (the design's
 * two-right-answers case; momentariness comes from the stream, the Motion
 * precedent). A persistent ⊤ restarting every evaluation is the documented
 * taught hazard, not something to engineer away here.
 */
export function reconcile(
    live: ReadonlyMap<string, LiveMusic>,
    present: readonly MusicData[],
    /**
     * True when this evaluation begins a new performance — the creator restarted
     * the program, or played it again after an edit. A piece that already played
     * to its end sounds again, the way a `Say` speaks again: the creator asked to
     * watch the program from the top, and a silent score is not that. Resuming a
     * paused performance passes false, which is what keeps a one-shot from
     * re-firing every time the stage is glanced away from.
     */
    beginning = false,
): Map<string, Decision> {
    const decisions = new Map<string, Decision>();

    for (const data of present) {
        const playing = live.get(data.name);
        if (playing === undefined) {
            decisions.set(data.name, { kind: 'start', data });
        } else if (data.replay) {
            decisions.set(data.name, { kind: 'restart', data });
        } else if (beginning) {
            // A new performance plays the piece again wherever it had got to,
            // finished or not: it is the same request as pressing replay.
            decisions.set(data.name, { kind: 'restart', data });
        } else if (playing.finished) {
            // It played to its end and is still on stage. An edit sounds it
            // again — the creator changed the music and expects to hear it,
            // the same reason an edit splices into one still playing. Anything
            // else stays silent: without that, every later evaluation — another
            // choice, a pointer move, a stream tick — would find no live entry
            // and start it over.
            decisions.set(
                data.name,
                signatureOf(playing.data) !== signatureOf(data)
                    ? { kind: 'restart', data }
                    : { kind: 'keep' },
            );
        } else if (playing.draining) {
            // It exited and came back while still sounding; re-entry
            // interrupts rather than layering.
            decisions.set(data.name, { kind: 'restart', data });
        } else if (signatureOf(playing.data) !== signatureOf(data)) {
            decisions.set(data.name, { kind: 'splice', data });
        } else {
            decisions.set(data.name, { kind: 'keep' });
        }
    }

    for (const [name, playing] of live) {
        if (decisions.has(name)) continue;
        if (playing.finished) {
            // Done and gone: forget it, so coming back on stage is a start.
            decisions.set(name, { kind: 'stop' });
        } else if (playing.draining) {
            // Already finishing; drain is idempotent.
            decisions.set(name, { kind: 'drain' });
        } else if (playing.data.tracks.some((track) => track.loop)) {
            // A looping music that exits stops; it would never end otherwise.
            decisions.set(name, { kind: 'stop' });
        } else {
            // A non-looping music plays to completion even after it exits,
            // so a one-shot ding is never truncated by the stage moving on.
            decisions.set(name, { kind: 'drain' });
        }
    }

    return decisions;
}
