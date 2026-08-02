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
                stopAt: () => undefined,
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
    });

    return {
        player,
        played,
        cancelled,
        beats,
        vibrations,
        ducking,
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
        ...options,
    };
}

function music(tracks: TrackData[], options: Partial<MusicData> = {}): MusicData {
    return {
        name: 'song',
        tempo: 60,
        volume: 1,
        key: 0,
        scale: [0, 2, 4, 5, 7, 9, 11],
        replay: false,
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

test('pausing silences, and playing again starts from the top', () => {
    const h = harness();
    const data = music([track([1, 2, 3, 4], { loop: true })]);
    h.player.update([data], true);
    h.advance(2);
    h.player.update([data], false);
    const beforeResume = h.played.length;
    h.player.update([data], true);
    h.advance(0);
    // The first note after resuming is beat 0 again.
    expect(h.played[beforeResume]?.startBeat).toBe(0);
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
    // The loop was cancelled, the one-shot was not.
    expect(h.cancelled.length).toBeGreaterThan(0);
    expect(h.cancelled.every((note) => note.music === 'loop')).toBe(true);
    h.advance(1);
    expect(h.played.some((note) => note.music === 'ding' && note.startBeat === 1)).toBe(
        true,
    );
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
    const tracks = Array.from({ length: 40 }, () =>
        track([1], { loop: true }),
    );
    h.player.update([music(tracks)], true);
    h.advance(0);
    expect(h.cancelled.length).toBeGreaterThan(0);
});
