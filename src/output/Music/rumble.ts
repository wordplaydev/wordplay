/**
 * How music feels on a gamepad (#1345): a first draft, to be revised with
 * Deaf and hard-of-hearing collaborators rather than settled here.
 *
 * A standard gamepad has two motors — a heavy, low-frequency one and a light,
 * high-frequency one — so a note's register picks between them: bass and kick
 * thump, melody and cymbals buzz, and the two can be felt against each other.
 * Every onset is a short pulse, because a new effect preempts the one playing,
 * so a pulse that outlasted the next onset would blur the rhythm away.
 */

import { instrumentSpec } from '#output/Music/instruments.ts';
import type { ScheduledNote } from '#output/Music/schedule.ts';
import { isPitched, kitIndex } from '#output/Music/synthesis.ts';
import {
    canRumble,
    connectedGamepads,
    type Rumbler,
} from '#db/settings/supportsVibration.ts';

export type Rumble = {
    /** The heavy motor, 0–1. */
    strong: number;
    /** The light motor, 0–1. */
    weak: number;
    /** Milliseconds. */
    duration: number;
};

/** Semitones from middle C at which a note is all heavy motor (C2)… */
const LowestRegister = -24;
/** …and all light motor (C6). */
const HighestRegister = 24;

/** Below roughly this, a rumble motor doesn't spin up at all, so a quiet note
 *  would be silently dropped rather than felt quietly. */
export const RumbleFloor = 0.15;
/** Short enough that consecutive onsets stay separate, long enough to feel. */
export const ShortestRumble = 40;
export const LongestRumble = 150;

/** Each kit piece's [heavy, light] share, keyed by the names in `instruments.ts`. */
const KitRumble: Record<string, [number, number]> = {
    bass: [1, 0],
    tomtom: [0.8, 0.2],
    snare: [0.5, 0.5],
    hihat: [0, 1],
    cymbal: [0, 1],
    cowbell: [0, 1],
};

/** The [heavy, light] share of one note, before its velocity. */
function shareOf(note: ScheduledNote): [number, number] {
    if (!isPitched(note.instrument)) {
        const piece = instrumentSpec(note.instrument)?.kit?.[
            kitIndex(note.instrument, note.degree)
        ];
        return (
            (piece !== undefined ? KitRumble[piece] : undefined) ?? [0.5, 0.5]
        );
    }
    const t = Math.min(
        1,
        Math.max(
            0,
            (note.semitones - LowestRegister) /
                (HighestRegister - LowestRegister),
        ),
    );
    return [1 - t, t];
}

/** Lift a felt magnitude to where the motor responds, and cap a loud chord. */
function feelable(magnitude: number): number {
    return magnitude <= 0 ? 0 : Math.min(1, Math.max(RumbleFloor, magnitude));
}

/** The one rumble for every note that became audible together, or undefined
 *  when there is nothing to feel. */
export function rumbleFor(notes: readonly ScheduledNote[]): Rumble | undefined {
    let strong = 0;
    let weak = 0;
    let longest = 0;
    for (const note of notes) {
        if (note.velocity <= 0) continue;
        const [heavy, light] = shareOf(note);
        strong += heavy * note.velocity;
        weak += light * note.velocity;
        longest = Math.max(longest, note.durationSeconds * 1000);
    }
    if (strong <= 0 && weak <= 0) return undefined;
    return {
        strong: feelable(strong),
        weak: feelable(weak),
        duration: Math.min(LongestRumble, Math.max(ShortestRumble, longest)),
    };
}

/** Rumble every connected gamepad that can. */
export function rumbleGamepads(
    rumble: Rumble,
    pads: readonly (Rumbler | null)[] = connectedGamepads(),
): void {
    for (const pad of pads) {
        if (!canRumble(pad)) continue;
        // A newer effect preempts this one, which rejects or resolves as
        // "preempted" depending on the browser; neither is a failure here.
        pad.vibrationActuator
            .playEffect('dual-rumble', {
                duration: rumble.duration,
                strongMagnitude: rumble.strong,
                weakMagnitude: rumble.weak,
            })
            .catch(() => undefined);
    }
}
