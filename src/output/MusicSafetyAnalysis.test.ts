import { expect, test } from 'vitest';
import type { MusicData, TrackData } from '@output/Music/musicData';
import analyzeMusicSafety, {
    analyzeMusic,
} from '@output/MusicSafetyAnalysis';

function track(
    notes: { degrees: number[]; beats?: number; volume?: number }[],
    options: Partial<TrackData> = {},
): TrackData {
    return {
        notes: notes.map((note) => ({
            degrees: note.degrees,
            beats: note.beats ?? 1,
            volume: note.volume ?? 0.5,
        })),
        instrument: 'piano',
        scale: [0, 2, 4, 5, 7, 9, 11],
        key: 0,
        volume: 1,
        pan: 0,
        loop: false,
        mash: true,
        ...options,
    };
}

function music(tracks: TrackData[], options: Partial<MusicData> = {}): MusicData {
    return {
        name: 'song',
        tempo: 120,
        volume: 1,
        key: 0,
        scale: [0, 2, 4, 5, 7, 9, 11],
        replay: false,
        pause: false,
        description: undefined,
        tracks,
        ...options,
    };
}

test('ordinary music raises no warnings', () => {
    const risks = analyzeMusic(
        music([track([{ degrees: [1] }, { degrees: [3] }, { degrees: [5] }])]),
    );
    expect([...risks]).toEqual([]);
});

test('a jump out of a quiet passage is a startle', () => {
    const risks = analyzeMusic(
        music([
            track([
                { degrees: [1], volume: 0.1 },
                { degrees: [3], volume: 1 },
            ]),
        ]),
    );
    expect(risks.has('startle')).toBe(true);
});

test('a loud first note after a looping track ends quiet startles', () => {
    const risks = analyzeMusic(
        music([
            track(
                [
                    { degrees: [1], volume: 1 },
                    { degrees: [3], volume: 0.1 },
                ],
                { loop: true },
            ),
        ]),
    );
    expect(risks.has('startle')).toBe(true);
});

test('a long run at full volume is sustained loudness', () => {
    const notes = Array.from({ length: 10 }, () => ({
        degrees: [1],
        volume: 1,
    }));
    expect(analyzeMusic(music([track(notes)])).has('loudness')).toBe(true);
});

test('many tracks sum loud even when each is modest', () => {
    const tracks = Array.from({ length: 4 }, () =>
        track([{ degrees: [1] }], { volume: 0.6 }),
    );
    expect(analyzeMusic(music(tracks)).has('loudness')).toBe(true);
});

test('a fast beat crosses the seizure band, sharing the flash threshold', () => {
    // 180bpm in sixteenths is 12Hz, far past the 3Hz threshold.
    const fast = music([track([{ degrees: [1], beats: 0.25 }])], {
        tempo: 180,
    });
    expect(analyzeMusic(fast).has('pulse')).toBe(true);
    // A quarter-note pulse at 120bpm is 2Hz, below it.
    expect(analyzeMusic(music([track([{ degrees: [1] }])])).has('pulse')).toBe(
        false,
    );
});

test('degrees far from the tonic are an uncomfortable register', () => {
    // translate(ƒ(n) n + 20) is one keystroke from + 2.
    expect(
        analyzeMusic(music([track([{ degrees: [21] }])])).has('register'),
    ).toBe(true);
    // Percussion indexes a kit rather than transposing, so it can't wander.
    expect(
        analyzeMusic(
            music([track([{ degrees: [21] }], { instrument: 'drums' })]),
        ).has('register'),
    ).toBe(false);
});

test('a fractional degree far from the tonic is caught too', () => {
    // It wasn't: the degree resolved to NaN, and every comparison against NaN
    // is false, so a wandering register slipped through silently.
    expect(
        analyzeMusic(music([track([{ degrees: [21.5] }])])).has('register'),
    ).toBe(true);
    expect(
        analyzeMusic(music([track([{ degrees: [1.5] }])])).has('register'),
    ).toBe(false);
});

test('more tracks than a listener can follow is a comfort warning', () => {
    const many = Array.from({ length: 13 }, () =>
        track([{ degrees: [1], volume: 0.05 }], { volume: 0.05 }),
    );
    expect(analyzeMusic(music(many)).has('tracks')).toBe(true);
});

test('risks sum across several musics on one stage', () => {
    const quiet = music([track([{ degrees: [1] }], { volume: 0.6 })], {
        name: 'a',
    });
    const other = music([track([{ degrees: [1] }], { volume: 0.6 })], {
        name: 'b',
    });
    const third = music([track([{ degrees: [1] }], { volume: 0.6 })], {
        name: 'c',
    });
    const fourth = music([track([{ degrees: [1] }], { volume: 0.6 })], {
        name: 'd',
    });
    // Each alone is fine; together they sum past the threshold.
    expect(analyzeMusic(quiet).has('loudness')).toBe(false);
    expect(
        analyzeMusicSafety([quiet, other, third, fourth]).has('loudness'),
    ).toBe(true);
});

test('an empty stage has no music risks', () => {
    expect([...analyzeMusicSafety([])]).toEqual([]);
});
