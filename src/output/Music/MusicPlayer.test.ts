import { expect, test } from 'vitest';
import type { MusicData, TrackData } from '@output/Music/musicData';
import type {
    MusicAudioLike,
    PlayerBus,
    PlayingVoice,
} from '@output/Music/MusicAudio';
import type { ScheduledNote, BeatTick } from '@output/Music/schedule';
import MusicPlayer from '@output/Music/MusicPlayer';

/** An audio layer that records instead of sounding, with a manual clock —
 * the announcerQueue test-harness pattern. */
function harness() {
    let clock = 0;
    const played: ScheduledNote[] = [];
    const cancelled: ScheduledNote[] = [];
    const ducking: { ducked: boolean; depth: number }[] = [];
    const bus: PlayerBus = {
        trackNode: () => undefined,
        dispose: () => undefined,
    };
    const audio: MusicAudioLike = {
        now: () => clock,
        createBus: () => bus,
        playNote: (_bus, note): PlayingVoice => {
            played.push(note);
            return {
                // What the real audio layer reports: when the note stops being
                // audible. The player needs it to tell a note that has ended
                // from one that merely started.
                endsAt: note.startTime + note.durationSeconds,
                cancel: () => cancelled.push(note),
            };
        },
        setDucked: (ducked, depth) => ducking.push({ ducked, depth }),
        isSuspended: () => false,
        resume: async () => undefined,
    };

    let fire: (() => void) | undefined = undefined;
    const beats: BeatTick[] = [];
    const vibrations: number[] = [];
    /** Instruments whose samples haven't arrived; empty means everything can play. */
    const unready = new Set<string>();
    /** Listeners the player registered for readiness changes. */
    const readyListeners = new Set<() => void>();
    const player = new MusicPlayer({
        audio,
        setTimer: (callback) => {
            fire = callback;
            return () => {
                fire = undefined;
            };
        },
        onBeat: (beat) => beats.push(beat),
        vibrate: (ms) => vibrations.push(ms),
        isHidden: () => false,
        ready: (instrument) => !unready.has(instrument),
        observeReady: (listener) => {
            readyListeners.add(listener);
            return () => readyListeners.delete(listener);
        },
    });

    return {
        player,
        played,
        cancelled,
        beats,
        vibrations,
        ducking,
        /** Hold an instrument's samples back, as a slow network would. */
        hold(instrument: string) {
            unready.add(instrument);
        },
        /** Its samples arrived (or failed, which also releases the hold), and
         *  the loader announces it the way the real one does. */
        release(instrument: string) {
            unready.delete(instrument);
            for (const listener of readyListeners) listener();
        },
        /** Advance the audio clock and run one scheduler tick. */
        advance(seconds: number) {
            clock += seconds;
            player.tick();
        },
        get running() {
            return fire !== undefined;
        },
    };
}

function track(degrees: number[], options: Partial<TrackData> = {}): TrackData {
    return {
        notes: degrees.map((degree) => ({
            degrees: [degree],
            beats: 1,
            volume: 1,
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

function music(
    tracks: TrackData[],
    options: Partial<MusicData> = {},
): MusicData {
    return {
        name: 'song',
        tempo: 60,
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

test('music on a playing stage sounds; a paused stage is silent', () => {
    const h = harness();
    h.player.update([music([track([1, 2, 3])])], false);
    expect(h.played).toHaveLength(0);
    expect(h.running).toBe(false);

    h.player.update([music([track([1, 2, 3])])], true);
    h.advance(0);
    expect(h.played.map((note) => note.degree)).toEqual([1]);
});

test('an unchanged music keeps playing without restarting', () => {
    const h = harness();
    const data = music([track([1, 2, 3, 4], { loop: true })]);
    h.player.update([data], true);
    h.advance(0);
    h.advance(1);
    const before = h.played.length;
    // Re-evaluating with identical content decides "keep": nothing cancels.
    h.player.update([music([track([1, 2, 3, 4], { loop: true })])], true);
    expect(h.cancelled).toHaveLength(0);
    h.advance(1);
    expect(h.played.length).toBeGreaterThan(before);
});

test('replay restarts on every evaluation that carries it', () => {
    const h = harness();
    h.player.update([music([track([1, 2, 3])])], true);
    h.advance(0);
    expect(h.played.map((note) => note.degree)).toEqual([1]);

    // Two consecutive evaluations, each with replay ⊤ and identical notes:
    // both restart, so the two-right-answers case sounds twice.
    const replaying = music([track([1, 2, 3])], { replay: true });
    h.player.update([replaying], true);
    h.advance(0.1);
    h.player.update([replaying], true);
    h.advance(0.1);
    const firstNotes = h.played.filter((note) => note.startBeat === 0);
    expect(firstNotes).toHaveLength(3);
});

test('silence cancels everything sounding and stops the timer', () => {
    const h = harness();
    h.player.update([music([track([1, 2, 3], { loop: true })])], true);
    h.advance(0);
    expect(h.played.length).toBeGreaterThan(0);
    expect(h.running).toBe(true);

    h.player.silence();
    expect(h.cancelled.length).toBeGreaterThan(0);
    expect(h.running).toBe(false);
    const after = h.played.length;
    h.advance(5);
    expect(h.played).toHaveLength(after);
});

test('playing again picks the piece up where the pause froze it', () => {
    const h = harness();
    const data = music([track([1, 2, 3, 4], { loop: true })]);
    h.player.update([data], true);
    h.advance(2.5);
    h.player.update([data], false);
    const beforeResume = h.played.length;
    // Ten seconds of wall clock pass with the stage paused. The audio clock
    // runs on regardless, so a transport that wasn't re-anchored would come
    // back twelve beats further along than it left.
    h.advance(10);
    h.player.update([data], true);
    // Far enough for the next onset to enter the lookahead window.
    h.advance(1);
    const resumed = h.played.slice(beforeResume).map((note) => note.startBeat);
    // The half of beat 2's note that hadn't been heard, then beat 3 —
    // not beat 0, and not beat 12.5 where the clock ran to.
    expect(resumed[0]).toBeCloseTo(2.5);
    expect(resumed[1]).toBeCloseTo(3);
});

test('the playhead holds still while paused rather than running on', () => {
    const h = harness();
    const data = music([track([1, 2, 3, 4], { loop: true })]);
    h.player.update([data], true);
    h.advance(2);
    h.player.update([data], false);
    expect(h.player.positions().get('song')?.beat).toBeCloseTo(2);
    h.advance(30);
    // A frozen music is not thirty beats further along; nobody heard those.
    expect(h.player.positions().get('song')?.beat).toBeCloseTo(2);
});

test('a beat already heard is not sent again on resume', () => {
    const h = harness();
    // 60bpm, so pausing at a whole second pauses on an exact integer beat —
    // the case where recomputing the count from the position sends it twice.
    const data = music([track([1, 1, 1, 1], { loop: true })]);
    h.player.update([data], true);
    h.advance(2);
    expect(h.beats.map((beat) => beat.count)).toEqual([0, 1, 2]);
    h.player.update([data], false);
    h.advance(5);
    h.player.update([data], true);
    h.advance(1);
    expect(h.beats.map((beat) => beat.count)).toEqual([0, 1, 2, 3]);
});

test('resuming inside a held note plays out the rest of it', () => {
    const h = harness();
    // One four-beat chord: pause a beat in and the next onset is three beats
    // away, so without a pickup the resume would be silent through all of it.
    const held = music([
        {
            ...track([1]),
            notes: [{ degrees: [1, 5], beats: 4, volume: 1 }],
            loop: true,
        },
    ]);
    h.player.update([held], true);
    h.advance(1);
    h.player.update([held], false);
    const beforeResume = h.played.length;
    h.player.update([held], true);
    h.advance(0);
    const pickup = h.played.slice(beforeResume);
    expect(pickup.length).toBeGreaterThanOrEqual(2);
    expect(pickup[0].startBeat).toBeCloseTo(1);
    expect(pickup[0].durationBeats).toBeCloseTo(3);
});

test('a creator can hold one music while another plays on', () => {
    const h = harness();
    const held = music([track([1, 2, 3, 4], { loop: true })], { name: 'held' });
    const going = music([track([1, 2, 3, 4], { loop: true })], {
        name: 'going',
    });
    h.player.update([held, going], true);
    h.advance(2);
    h.player.update([{ ...held, pause: true }, going], true);
    const beforeHold = h.played.length;
    h.advance(4);
    const after = h.played.slice(beforeHold);
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((note) => note.music === 'going')).toBe(true);
    // And it is holding its place, not stopped and forgotten.
    expect(h.player.positions().get('held')?.beat).toBeCloseTo(2);
});

test('a music held from its first evaluation waits at the top', () => {
    const h = harness();
    const data = music([track([1, 2, 3, 4], { loop: true })], { pause: true });
    h.player.update([data], true);
    h.advance(3);
    expect(h.played).toHaveLength(0);
    expect(h.player.positions().get('song')?.beat).toBe(0);
    h.player.update([{ ...data, pause: false }], true);
    h.advance(0);
    expect(h.played[0]?.startBeat).toBe(0);
});

test('replay while held rewinds to the top and stays held', () => {
    const h = harness();
    const data = music([track([1, 2, 3, 4], { loop: true })]);
    h.player.update([data], true);
    h.advance(2);
    h.player.update([{ ...data, pause: true, replay: true }], true);
    const beforeReplay = h.played.length;
    h.advance(3);
    expect(h.played).toHaveLength(beforeReplay);
    expect(h.player.positions().get('song')?.beat).toBe(0);
});

test('a music that left the stage is retired by a pause, not stranded', () => {
    const h = harness();
    // A stopping entry is only ringing out, and its sole retirement is at the
    // bottom of tick(), which a frozen entry never reaches.
    h.player.update([music([track([1, 2, 3], { loop: true })])], true);
    h.advance(0.5);
    h.player.update([], true);
    h.player.update([], false);
    expect(h.player.size).toBe(0);
});

test('beats are emitted when they become audible, not when scheduled', () => {
    const h = harness();
    // 60bpm: beat n at second n. The first tick schedules 150ms ahead, so
    // beat 1 is decided long before it sounds.
    h.player.update([music([track([1, 1, 1], { loop: true })])], true);
    h.advance(0);
    expect(h.beats.map((beat) => beat.count)).toEqual([0]);
    h.advance(0.5);
    expect(h.beats.map((beat) => beat.count)).toEqual([0]);
    h.advance(0.6);
    expect(h.beats.map((beat) => beat.count)).toEqual([0, 1]);
    // Haptics ride the same emission point.
    expect(h.vibrations).toHaveLength(2);
});

test('a looping music that exits stops; a one-shot finishes', () => {
    const h = harness();
    h.player.update(
        [
            music([track([1], { loop: true })], { name: 'loop' }),
            music([track([1, 2, 3])], { name: 'ding' }),
        ],
        true,
    );
    h.advance(0);
    h.player.update([], true);
    // Neither is cut. The loop stops looping and the one-shot plays on, but
    // the note each of them had already started rings out — leaving the stage
    // is not a reason to silence a sound mid-note. This test used to assert
    // that the loop's voices were cancelled, which is the behaviour that made
    // every sound effect in the gallery cut off a frame after it began.
    expect(h.cancelled).toHaveLength(0);
    h.advance(1);
    expect(
        h.played.some((note) => note.music === 'ding' && note.startBeat === 1),
    ).toBe(true);
});

test('ducking passes through to the audio layer only on change', () => {
    const h = harness();
    h.player.setDucking(true, 0.2);
    h.player.setDucking(true, 0.2);
    h.player.setDucking(false, 0.2);
    expect(h.ducking).toEqual([
        { ducked: true, depth: 0.2 },
        { ducked: false, depth: 0.2 },
    ]);
});

test('the voice cap steals rather than letting voices grow without bound', () => {
    const h = harness();
    // 40 tracks striking every beat exceeds the 32-voice cap.
    const tracks = Array.from({ length: 40 }, () => track([1], { loop: true }));
    h.player.update([music(tracks)], true);
    h.advance(0);
    expect(h.cancelled.length).toBeGreaterThan(0);
});

/* ---------------------------------------------------------------- *
 * Sounds finish playing
 *
 * The shape every sound effect in the gallery has: a note list derived from
 * momentary state, empty the rest of the time. Chimes, Building Blocks, and
 * Humming Bird are all written this way, and all three were cut off a frame
 * after they started.
 * ---------------------------------------------------------------- */

/** Play a sound effect the way a stream-driven example does: silent, one
 * frame of notes, then silent again, at a given frame interval. */
function soundEffect(h: ReturnType<typeof harness>, interval: number) {
    const silent = music([track([])], { name: 'fx' });
    const struck = music([track([5])], { name: 'fx' });
    h.player.update([silent], true);
    h.advance(interval);
    h.player.update([struck], true);
    h.advance(interval);
    for (let frame = 0; frame < 12; frame++) {
        h.player.update([silent], true);
        h.advance(interval);
    }
}

test('a sound effect whose notes empty a frame later still rings out', () => {
    // Humming Bird's 40ms clock. The note lasts a beat — a second at this
    // tempo — so nothing may silence it twelve frames later.
    const h = harness();
    soundEffect(h, 0.04);
    expect(h.played.map((note) => note.degree)).toEqual([5]);
    expect(h.cancelled, 'the note was cut off').toHaveLength(0);
    expect(h.played[0].durationSeconds).toBe(1);
});

// Catch-up delivers the missed evaluation and the current one back to back,
// with no frame between them. The restart installs a transport at `now`, and
// the splice that follows lands at the next whole beat — strictly ahead of the
// note just struck — so a zero gap must ring exactly like a 40ms one.
test('a replay and the frame that empties it, delivered with no gap, still rings', () => {
    const h = harness();
    const silent = music([track([])], { name: 'fx' });
    h.player.update([silent], true);
    h.advance(0.04);

    // Both in one task: the evaluation that carried the replay, then the one
    // that emptied the notes again.
    h.player.update(
        [{ ...music([track([5])], { name: 'fx' }), replay: true }],
        true,
    );
    h.player.update([silent], true);
    h.advance(0.04);
    for (let frame = 0; frame < 12; frame++) {
        h.player.update([silent], true);
        h.advance(0.04);
    }

    expect(h.played.map((note) => note.degree)).toEqual([5]);
    expect(h.cancelled, 'the note was cut off').toHaveLength(0);
    expect(h.played[0].durationSeconds).toBe(1);
});

// Why the catch-up limit is free: a burst of restarts cancels its own voices
// before any of them schedules a note, so only the last was ever audible.
test('several replays in one task sound once, not once each', () => {
    const h = harness();
    const struck = music([track([5])], { name: 'fx' });
    h.player.update([struck], true);
    h.advance(0.04);
    const before = h.played.length;

    for (let again = 0; again < 3; again++)
        h.player.update([{ ...struck, replay: true }], true);
    h.advance(0.04);

    expect(h.played.length - before).toBe(1);
});

test('the same holds at a slower frame rate', () => {
    // Building Blocks' 150ms tick.
    const h = harness();
    soundEffect(h, 0.15);
    expect(h.played.map((note) => note.degree)).toEqual([5]);
    expect(h.cancelled).toHaveLength(0);
});

test('a looping music that leaves the stage rings out but schedules no more', () => {
    const h = harness();
    h.player.update(
        [music([track([1, 2, 3], { loop: true })], { name: 'loop' })],
        true,
    );
    h.advance(0);
    const before = h.played.length;
    expect(before).toBeGreaterThan(0);

    h.player.update([], true);
    h.advance(0.04);
    // Leaving the stage stops the music; it does not silence the note that is
    // already sounding.
    expect(h.cancelled).toHaveLength(0);
    // But nothing further is scheduled, so a loop really does end.
    h.advance(5);
    expect(h.played).toHaveLength(before);
});

test('replay still interrupts, because starting over is the point of it', () => {
    const h = harness();
    const data = music([track([1, 2, 3])], { name: 'ding' });
    h.player.update([data], true);
    h.advance(0);
    h.player.update([{ ...data, replay: true }], true);
    h.advance(0);
    expect(h.cancelled.length).toBeGreaterThan(0);
});

test('pausing still cuts everything immediately', () => {
    const h = harness();
    h.player.update([music([track([1, 2, 3])])], true);
    h.advance(0);
    h.player.update([music([track([1, 2, 3])])], false);
    expect(h.cancelled.length).toBeGreaterThan(0);
});

/* ---------------------------------------------------------------- *
 * Playback position
 *
 * The sheet-music rendering needs a playhead. This is the only honest source
 * of one — the same `beatAt` the scheduler uses — so it has to be exact, not
 * an estimate, and it has to survive a tempo change.
 * ---------------------------------------------------------------- */

test("position advances with the clock at the music's tempo", () => {
    const h = harness();
    // 60bpm is one beat a second, so the clock and the beat agree.
    h.player.update(
        [
            music([track([1, 2, 3, 4], { loop: true })], {
                name: 'song',
                tempo: 60,
            }),
        ],
        true,
    );
    h.advance(0);
    expect(h.player.positions().get('song')?.beat).toBeCloseTo(0);
    h.advance(2);
    expect(h.player.positions().get('song')?.beat).toBeCloseTo(2);
    h.advance(1.5);
    expect(h.player.positions().get('song')?.beat).toBeCloseTo(3.5);
});

test('position runs at double speed at double tempo', () => {
    const h = harness();
    h.player.update(
        [music([track([1], { loop: true })], { name: 'fast', tempo: 120 })],
        true,
    );
    h.advance(2);
    expect(h.player.positions().get('fast')?.beat).toBeCloseTo(4);
});

test('position stays continuous across a tempo change', () => {
    const h = harness();
    const slow = music([track([1, 2, 3, 4], { loop: true })], {
        name: 'song',
        tempo: 60,
    });
    h.player.update([slow], true);
    h.advance(2.5);
    const before = h.player.positions().get('song')?.beat ?? 0;

    // A tempo change splices at the next beat boundary rather than restarting.
    h.player.update([{ ...slow, tempo: 120 }], true);
    h.advance(0.01);
    const after = h.player.positions().get('song')?.beat ?? 0;
    // No jump: the transport re-anchors rather than resetting to zero.
    expect(after).toBeGreaterThanOrEqual(before);
    expect(after - before).toBeLessThan(0.2);
});

test('position reports the version that is sounding, not the one just written', () => {
    const h = harness();
    const first = music([track([1, 2])], { name: 'song' });
    h.player.update([first], true);
    h.advance(0);
    // An edit splices at the next beat, so until then the sounding version is
    // still the old one — which is what a score should draw.
    h.player.update([music([track([1, 2, 3, 4])], { name: 'song' })], true);
    expect(h.player.positions().get('song')?.data.tracks[0].notes).toHaveLength(
        2,
    );
});

test('a music that never started has no position', () => {
    const h = harness();
    expect(h.player.positions().size).toBe(0);
    h.player.update([music([track([1])], { name: 'song' })], true);
    h.advance(0);
    expect(h.player.positions().has('song')).toBe(true);
});

test('positionsAt walks back to where a music was at an earlier mark', () => {
    const h = harness();
    const data = music([track([1, 2, 3, 4], { loop: true })]);
    // Four evaluations, one a second apart, each stamped with where the
    // caller was in its own history.
    for (const [mark, at] of [
        [10, 0],
        [20, 1],
        [30, 2],
        [40, 3],
    ]) {
        h.advance(at - (h.player.positions().get('song')?.beat ?? 0));
        h.player.update([data], true, mark);
    }
    expect(h.player.positionsAt(40).get('song')).toBeCloseTo(3);
    expect(h.player.positionsAt(20).get('song')).toBeCloseTo(1);
    // Between marks, the latest one at or before it.
    expect(h.player.positionsAt(25).get('song')).toBeCloseTo(1);
    // Further back than we sampled clamps to the oldest rather than guessing.
    expect(h.player.positionsAt(0).get('song')).toBeCloseTo(0);
});

test('an unmarked update records no history, so previews cost nothing', () => {
    const h = harness();
    h.player.update([music([track([1, 2, 3])])], true);
    h.advance(1);
    expect(h.player.positionsAt(100).size).toBe(0);
});

test('a piece waits for its instruments rather than playing a placeholder', () => {
    const h = harness();
    h.hold('piano');
    h.player.update([music([track([1, 2, 3])])], true);
    h.advance(0.1);
    // Nothing sounds and nothing is scheduled: the old behaviour synthesized
    // here, and the note it committed could never be re-rendered.
    expect(h.played).toHaveLength(0);
});

test('it starts from the beginning once they arrive, not partway through', () => {
    const h = harness();
    h.hold('piano');
    h.player.update([music([track([1, 2, 3])])], true);
    h.advance(2);

    h.release('piano');
    h.player.update([music([track([1, 2, 3])])], true);
    h.advance(0.1);

    expect(h.played.length).toBeGreaterThan(0);
    // The distinction that matters: delaying, not dropping. Anchoring the
    // transport at the original clock would have started this two seconds in,
    // skipping the opening notes.
    expect(h.played[0].startBeat).toBe(0);
});

test('a failed instrument does not hold the piece up forever', () => {
    // `ready` is true for a failed load as well as a finished one, so a file
    // that will never arrive means synthesis rather than permanent silence.
    const h = harness();
    h.player.update([music([track([1, 2, 3], { instrument: 'synth' })])], true);
    h.advance(0.1);
    expect(h.played.length).toBeGreaterThan(0);
});

test('one unready track holds the whole piece, not just its own part', () => {
    // Starting the drums while the piano is still arriving would play a
    // fragment of the arrangement, which is worse than a moment of silence.
    const h = harness();
    h.hold('piano');
    h.player.update(
        [music([track([1, 2, 3]), track([1, 2, 3], { instrument: 'drums' })])],
        true,
    );
    h.advance(0.1);
    expect(h.played).toHaveLength(0);
});

test('a held piece starts itself when its instruments arrive', () => {
    // The deadlock this guards: a project whose only stream is @Beat (Fireworks)
    // gets no further evaluations while its music is silent, so nothing would
    // ever call update() again. Waiting on the next evaluation means waiting on
    // the beat that the waiting itself is preventing.
    const h = harness();
    h.hold('piano');
    h.player.update([music([track([1, 2, 3])])], true);
    h.advance(0.1);
    expect(h.played).toHaveLength(0);

    // Samples arrive. No update() call, no evaluation — as in the real deadlock.
    h.release('piano');
    h.advance(0.1);

    expect(h.played.length).toBeGreaterThan(0);
    expect(h.played[0].startBeat).toBe(0);
});
