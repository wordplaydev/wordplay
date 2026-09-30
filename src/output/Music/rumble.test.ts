import { expect, test } from 'vitest';
import {
    LongestRumble,
    RumbleFloor,
    ShortestRumble,
    rumbleFor,
} from '@output/Music/rumble';
import type { ScheduledNote } from '@output/Music/schedule';

function note(options: Partial<ScheduledNote> = {}): ScheduledNote {
    return {
        music: 'song',
        trackIndex: 0,
        noteIndex: 0,
        degree: 1,
        semitones: 0,
        startBeat: 0,
        startTime: 0,
        durationBeats: 1,
        durationSeconds: 0.1,
        velocity: 1,
        pan: 0,
        instrument: 'piano',
        words: undefined,
        ...options,
    };
}

const drum = (degree: number) => note({ instrument: 'drums', degree });

test('a bass drum is the heavy motor alone, a hihat the light one', () => {
    expect(rumbleFor([drum(1)])).toMatchObject({ strong: 1, weak: 0 });
    expect(rumbleFor([drum(3)])).toMatchObject({ strong: 0, weak: 1 });
});

test('register chooses between the motors', () => {
    const low = rumbleFor([note({ semitones: -18 })]);
    const high = rumbleFor([note({ semitones: 18 })]);
    expect(low?.strong).toBeGreaterThan(low?.weak ?? 1);
    expect(high?.weak).toBeGreaterThan(high?.strong ?? 1);
});

test('velocity scales the rumble, and a loud chord is capped', () => {
    const soft = rumbleFor([drum(1)].map((n) => ({ ...n, velocity: 0.5 })));
    expect(soft?.strong).toBe(0.5);
    const chord = rumbleFor([drum(1), drum(1), drum(1)]);
    expect(chord?.strong).toBe(1);
});

test('a quiet note is lifted to where the motor responds', () => {
    expect(rumbleFor([{ ...drum(1), velocity: 0.01 }])?.strong).toBe(
        RumbleFloor,
    );
});

test('a pulse stays short enough to keep onsets apart', () => {
    expect(rumbleFor([note({ durationSeconds: 4 })])?.duration).toBe(
        LongestRumble,
    );
    expect(rumbleFor([note({ durationSeconds: 0.001 })])?.duration).toBe(
        ShortestRumble,
    );
});

test('nothing to feel is no rumble', () => {
    expect(rumbleFor([])).toBeUndefined();
    expect(rumbleFor([note({ velocity: 0 })])).toBeUndefined();
});
