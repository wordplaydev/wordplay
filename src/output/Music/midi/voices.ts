/**
 * Splitting a MIDI track into voices a `Track` can express.
 *
 * A `Track` is one sequence of durations that tile without gaps, so it can
 * sound one thing at a time. A MIDI track routinely sounds several — a held
 * chord under a moving line. The only lossless way to keep both is to give
 * each simultaneous line its own `Track`, which is what this does. The number
 * of voices a track needs is the honest measure of what the single-sequence
 * model costs, so it is reported rather than hidden.
 *
 * Notes that begin *and* end together are not overlapping voices; they are a
 * chord, which one entry can hold. Those are grouped first so a block chord
 * doesn't explode into one track per note.
 */

import type { MIDINote } from '@output/Music/midi/parseMIDI';

/** Notes that sound together for the same span: one entry in a track. */
export type Simultaneity = {
    startTicks: number;
    durationTicks: number;
    /** Sorted low to high, so chords read consistently. */
    pitches: number[];
    /** The loudest of the group, since one entry carries one volume. */
    velocity: number;
};

/** Group notes that share an onset and a length into single entries. */
export function toSimultaneities(notes: readonly MIDINote[]): Simultaneity[] {
    const groups = new Map<string, Simultaneity>();
    for (const note of notes) {
        const key = `${note.startTicks}:${note.durationTicks}`;
        const existing = groups.get(key);
        if (existing === undefined)
            groups.set(key, {
                startTicks: note.startTicks,
                durationTicks: note.durationTicks,
                pitches: [note.pitch],
                velocity: note.velocity,
            });
        else {
            existing.pitches.push(note.pitch);
            existing.velocity = Math.max(existing.velocity, note.velocity);
        }
    }
    const out = [...groups.values()];
    for (const group of out) group.pitches.sort((a, b) => a - b);
    out.sort(
        (a, b) => a.startTicks - b.startTicks || a.pitches[0] - b.pitches[0],
    );
    return out;
}

/**
 * Partition simultaneities into voices, each of which never overlaps itself.
 *
 * Greedy by onset: put each entry in the first voice that has finished, and
 * open a new one only when none has. That yields the fewest voices a
 * left-to-right pass can manage, and keeps a melody in one voice rather than
 * scattering it, which matters because each voice becomes a `Track` someone
 * has to read.
 */
export default function splitVoices(
    notes: readonly MIDINote[],
): Simultaneity[][] {
    const entries = toSimultaneities(notes);
    const voices: Simultaneity[][] = [];
    /** The tick each voice is free again, parallel to `voices`. */
    const free: number[] = [];

    for (const entry of entries) {
        let placed = false;
        for (let v = 0; v < voices.length; v++) {
            if (free[v] <= entry.startTicks) {
                voices[v].push(entry);
                free[v] = entry.startTicks + entry.durationTicks;
                placed = true;
                break;
            }
        }
        if (!placed) {
            voices.push([entry]);
            free.push(entry.startTicks + entry.durationTicks);
        }
    }

    return voices;
}

/** The most notes sounding at once, which is the voice count a track needs. */
export function maxPolyphony(notes: readonly MIDINote[]): number {
    const edges: [number, number][] = [];
    for (const note of notes) {
        edges.push([note.startTicks, 1]);
        edges.push([note.startTicks + note.durationTicks, -1]);
    }
    // Ends before starts at the same tick: a note ending where another begins
    // is not an overlap.
    edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let current = 0;
    let most = 0;
    for (const [, delta] of edges) {
        current += delta;
        most = Math.max(most, current);
    }
    return most;
}
