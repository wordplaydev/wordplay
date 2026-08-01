/**
 * What the visualizations read: which instruments are sounding right now, and
 * how hard. The player writes here as notes become audible; `MusicView` and
 * the light show read it. Kept out of `MusicPlayer` itself (which takes it as
 * an injected callback) so the player stays testable without stores.
 */

import { writable, type Writable } from 'svelte/store';

export type InstrumentActivity = {
    /** The instrument id. */
    instrument: string;
    /** 0-1, how hard it was struck. */
    level: number;
    /** The scale degree, for the vertical offset within a column. */
    degree: number;
    /** −1 left … 1 right. */
    pan: number;
    /** Which track it came from, so several tracks of one instrument are
     * visibly distinct within their cluster. */
    track: number;
    /** A counter that changes on every strike, so a view can restart an
     * animation for a repeated note. */
    strike: number;
};

/** Per-music-name activity, replaced whenever anything sounds. */
export const musicActivity: Writable<Map<string, InstrumentActivity[]>> =
    writable(new Map());

let strikes = 0;

/** Record what just sounded for a music. */
export function reportActivity(
    music: string,
    sounding: Omit<InstrumentActivity, 'strike'>[],
) {
    strikes++;
    const counter = strikes;
    musicActivity.update((current) => {
        const next = new Map(current);
        next.set(
            music,
            sounding.map((entry) => ({ ...entry, strike: counter })),
        );
        return next;
    });
}

/** Forget a music's activity when it stops. */
export function clearActivity(music: string) {
    musicActivity.update((current) => {
        if (!current.has(music)) return current;
        const next = new Map(current);
        next.delete(music);
        return next;
    });
}
