/**
 * Which notes each music has sounding right now, so the editor can highlight
 * the expressions that determined them. Written by the player as notes start
 * and stop; read by `OutputView`, which resolves positions to nodes because it
 * is what holds the `Music` output the positions index into.
 *
 * A sibling of `activity.ts`, and kept out of `MusicPlayer` for the same reason
 * — the player takes it as an injected callback and stays testable without
 * stores. Positions rather than nodes, so nothing here depends on the AST.
 */

import { writable, type Writable } from 'svelte/store';

export type SoundingNote = {
    /** The track's index in the music. */
    track: number;
    /** The note's index in that track's notes. */
    note: number;
};

/** Per-music-name sounding notes, replaced whenever the set changes. */
export const soundingNotes: Writable<Map<string, readonly SoundingNote[]>> =
    writable(new Map());

/** Record what a music has sounding. An empty list means it has gone quiet. */
export function reportSounding(music: string, sounding: SoundingNote[]) {
    soundingNotes.update((current) => {
        if (sounding.length === 0) {
            if (!current.has(music)) return current;
            const next = new Map(current);
            next.delete(music);
            return next;
        }
        const next = new Map(current);
        next.set(music, sounding);
        return next;
    });
}

/** Forget a music's sounding notes when it stops. */
export function clearSounding(music: string) {
    soundingNotes.update((current) => {
        if (!current.has(music)) return current;
        const next = new Map(current);
        next.delete(music);
        return next;
    });
}
