import { expect, test } from 'vitest';
import {
    from,
    startOn,
    wrapPlayhead as wrapped,
} from '@output/Music/previewPlayer';
import MusicPlayer from '@output/Music/MusicPlayer';
import type { MusicAudioLike } from '@output/Music/MusicAudio';
import type { MusicData, TrackData } from '@output/Music/musicData';
import { Scales } from '@output/Music/scales';

function track(beats: number[]): TrackData {
    return {
        notes: beats.map((b, i) => ({ degrees: [i + 1], beats: b, volume: 1 })),
        instrument: 'piano',
        scale: Scales.major,
        key: 0,
        volume: 1,
        pan: 0,
        loop: false,
        mash: true,
    };
}

function music(tracks: TrackData[]): MusicData {
    return {
        name: 'song',
        tempo: 120,
        volume: 1,
        key: 0,
        scale: Scales.major,
        replay: false,
        pause: false,
        description: undefined,
        tracks,
    };
}

test('starting at zero changes nothing', () => {
    const data = music([track([1, 1, 1])]);
    expect(from(data, 0)).toEqual(data);
});

test('a cursor drops what falls before it', () => {
    const data = music([track([1, 1, 1, 1])]);
    const rest = from(data, 2);
    expect(rest.tracks[0].notes.map((n) => n.degrees)).toEqual([[3], [4]]);
    expect(rest.tracks[0].notes.map((n) => n.beats)).toEqual([1, 1]);
});

test('a note the cursor lands inside plays only what was left of it', () => {
    // The same rule the transport's own pickup uses when a paused piece
    // resumes, so starting mid-note continues rather than re-striking.
    const data = music([track([4, 1])]);
    const rest = from(data, 3);
    expect(rest.tracks[0].notes).toHaveLength(2);
    expect(rest.tracks[0].notes[0].beats).toBe(1);
    expect(rest.tracks[0].notes[0].degrees).toEqual([1]);
});

test('every track is cut at the same beat, so they stay in step', () => {
    const data = music([track([2, 2]), track([1, 1, 1, 1])]);
    const rest = from(data, 2);
    expect(rest.tracks[0].notes.map((n) => n.degrees)).toEqual([[2]]);
    expect(rest.tracks[1].notes.map((n) => n.degrees)).toEqual([[3], [4]]);
});

test('a cursor past the end leaves nothing to play', () => {
    const rest = from(music([track([1, 1])]), 99);
    expect(rest.tracks[0].notes).toHaveLength(0);
});

test('everything but the notes survives the cut', () => {
    // Tempo, key, scale, and each track's instrument still describe the piece;
    // only where it starts has changed.
    const data = music([track([1, 1])]);
    const rest = from(data, 1);
    expect(rest.tempo).toBe(data.tempo);
    expect(rest.scale).toEqual(data.scale);
    expect(rest.tracks[0].instrument).toBe('piano');
    expect(rest.tracks[0].mash).toBe(true);
});

test('a looping playhead comes back to the start', () => {
    // The transport's beat climbs forever; the staff is one pass long, so an
    // unwrapped head walks off the end and never returns.
    const looping = [{ ...track([1, 1, 1, 1]), loop: true }];
    expect(wrapped(0, looping)).toBe(0);
    expect(wrapped(3, looping)).toBe(3);
    expect(wrapped(4, looping)).toBe(0);
    expect(wrapped(5.5, looping)).toBe(1.5);
    expect(wrapped(41, looping)).toBe(1);
});

test('a one-shot playhead stops rather than jumping back', () => {
    // Wrapping a piece that has ended would show a head moving through music
    // nobody is playing.
    const once = [{ ...track([1, 1, 1, 1]), loop: false }];
    expect(wrapped(9, once)).toBe(9);
});

test('a mixed piece is as long as its longest track', () => {
    // One looping track and one that ends is not a loop; leaving it unwrapped
    // is the honest answer rather than wrapping to the wrong length.
    const mixed = [
        { ...track([1, 1]), loop: true },
        { ...track([1, 1, 1, 1]), loop: false },
    ];
    expect(wrapped(7, mixed)).toBe(7);
});

test('every looping track wraps to the longest of them', () => {
    const both = [
        { ...track([1, 1]), loop: true },
        { ...track([1, 1, 1, 1]), loop: true },
    ];
    expect(wrapped(5, both)).toBe(1);
});

/* ---------------------------------------------------------------- *
 * Starting on a real player
 * ---------------------------------------------------------------- */

/** A player with a clock the test drives, recording what it sounds. */
function harness() {
    let clock = 0;
    const played: { startBeat: number; startTime: number }[] = [];
    const audio: MusicAudioLike = {
        now: () => clock,
        createBus: () => ({
            trackNode: () => undefined,
            dispose: () => undefined,
        }),
        playNote: (_bus, note) => {
            played.push({ startBeat: note.startBeat, startTime: note.startTime });
            return { endsAt: clock + 1, cancel: () => undefined };
        },
        setDucked: () => undefined,
        isSuspended: () => false,
        resume: async () => undefined,
    };
    let fire: (() => void) | undefined;
    const player = new MusicPlayer({
        audio,
        setTimer: (callback) => {
            fire = callback;
            return () => (fire = undefined);
        },
        ready: () => true,
    });
    return {
        player,
        played,
        /** Advance the clock and run one scheduling pass. */
        advance(seconds: number) {
            clock += seconds;
            fire?.();
        },
        beat: () => player.positions().get('song')?.beat,
    };
}

/** Eight quarter notes at 60bpm, so one beat is one second. */
function eight(): MusicData {
    return music([
        {
            ...track([1, 1, 1, 1, 1, 1, 1, 1]),
            loop: false,
        },
    ]);
}

test('playing after a pause starts from the cursor, not past it', () => {
    // The bug: trimming the music to start at the cursor changes its content,
    // and content handed to a *suspended* entry reads as "resume where you
    // froze, then splice these notes in" — so the trimmed piece was planted
    // partway through itself and playback jumped forward.
    const h = harness();
    const data = { ...eight(), tempo: 60 };

    startOn(h.player, data, 0);
    h.advance(0);
    h.advance(2.5);
    expect(h.beat()).toBeCloseTo(2.5, 1);

    // Pause, and let real time pass while paused.
    h.player.update([data], false);
    h.advance(10);

    // Play again from where it stopped.
    h.played.length = 0;
    startOn(h.player, data, 2.5);
    h.advance(0);

    // The first thing heard is the start of the trimmed piece, not something
    // several beats further in.
    expect(h.played.length).toBeGreaterThan(0);
    expect(Math.min(...h.played.map((n) => n.startBeat))).toBeCloseTo(0, 5);
    expect(h.beat()).toBeCloseTo(0, 1);
});

test('pausing and playing repeatedly does not compound', () => {
    // The old fault grew with each cycle, because each splice planted the
    // piece further into itself.
    const h = harness();
    const data = { ...eight(), tempo: 60 };
    startOn(h.player, data, 0);
    h.advance(0);

    for (const cursor of [1, 2, 3]) {
        h.advance(1);
        h.player.update([data], false);
        h.advance(5);
        startOn(h.player, data, cursor);
        h.advance(0);
        // Whatever the cursor, the piece always begins at its own beat 0.
        expect(h.beat(), `cursor ${cursor}`).toBeCloseTo(0, 1);
    }
});

test('a pause still holds the playhead still', () => {
    // The fix must not cost what already worked.
    const h = harness();
    const data = { ...eight(), tempo: 60 };
    startOn(h.player, data, 0);
    h.advance(0);
    h.advance(2);
    const at = h.beat();
    h.player.update([data], false);
    h.advance(30);
    expect(h.beat()).toBeCloseTo(at ?? 0, 5);
});
