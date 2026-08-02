/**
 * The per-evaluation decision: for each named music, does the player keep
 * going, splice a change in at the next beat, start, restart, drain, or
 * stop? Pure over plain data, because these rules — especially replay's —
 * are the part of the design that must be testable without an ear.
 */

import { signatureOf, type MusicData } from '@output/Music/musicData';

export type Decision =
    | { kind: 'start'; data: MusicData }
    | { kind: 'keep' }
    | { kind: 'splice'; data: MusicData }
    /** Cancel everything sounding and start from the top. */
    | { kind: 'restart'; data: MusicData }
    /** Exited with non-looping tracks unfinished; let them play out. */
    | { kind: 'drain' }
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
): Map<string, Decision> {
    const decisions = new Map<string, Decision>();

    for (const data of present) {
        const playing = live.get(data.name);
        if (playing === undefined) {
            decisions.set(data.name, { kind: 'start', data });
        } else if (data.replay) {
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
