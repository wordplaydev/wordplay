import { expect, test } from 'vitest';
import type { MusicData, TrackData } from '@output/Music/musicData';
import { signatureOf } from '@output/Music/musicData';
import {
    beatAt,
    createTransport,
    drain,
    requestSplice,
    timeOfBeat,
} from '@output/Music/transport';
import { scheduleWindow } from '@output/Music/schedule';
import { reconcile } from '@output/Music/reconcile';
import { chooseSteal, type Voice } from '@output/Music/voices';

/** A track of bare quarter notes on a piano, one beat each. */
function track(
    degrees: (number | null)[],
    options: Partial<TrackData> = {},
): TrackData {
    return {
        notes: degrees.map((degree) => ({
            degrees: degree === null ? [] : [degree],
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
        replay: false,
        description: undefined,
        tracks,
        ...options,
    };
}

test('notes land on the beat grid at the audio-clock times of their beats', () => {
    // 60 bpm from time 10: beat n sounds at 10 + n seconds.
    const transport = createTransport(music([track([1, null, 5])]), 10);
    const { notes, finished } = scheduleWindow(transport, 20);
    expect(notes.map((note) => [note.startBeat, note.startTime])).toEqual([
        [0, 10],
        [2, 12],
    ]);
    // The rest advanced the grid without sounding, and the track finished.
    expect(finished).toBe(true);
});

test('no note is decided twice across adjacent windows', () => {
    const transport = createTransport(
        music([track([1, 2, 3, 4], { loop: true })]),
        0,
    );
    const first = scheduleWindow(transport, 2.5);
    const second = scheduleWindow(first.next, 5);
    const all = [...first.notes, ...second.notes].map((note) => note.startBeat);
    expect(all).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(all).size).toBe(all.length);
});

test('tracks with different loop lengths stay phase-correct', () => {
    // Loop lengths 3 and 4 realign at their LCM, beat 12.
    const three = track([1, 2, 3], { loop: true });
    const four = track([1, 2, 3, 4], { loop: true, instrument: 'flute' });
    let transport = createTransport(music([three, four]), 0);
    const collected: [number, number][] = [];
    for (let window = 0; window < 13; window++) {
        const result = scheduleWindow(transport, window + 1);
        for (const note of result.notes)
            collected.push([note.trackIndex, note.startBeat]);
        transport = result.next;
    }
    // At beat 12 both tracks strike their first note together again.
    expect(collected.filter(([, beat]) => beat === 12)).toEqual([
        [0, 12],
        [1, 12],
    ]);
});

test('cursor onsets do not drift over thousands of iterations', () => {
    // A 0.1-beat note looped 10,000 times: onsets recompute from prefix
    // sums per pass, so error stays bounded rather than accumulating.
    const tiny = track([1], { loop: true });
    tiny.notes.forEach((note) => (note.beats = 0.1));
    let transport = createTransport(music([tiny], { tempo: 60000 }), 0);
    let last = -1;
    for (let window = 0; window < 10; window++) {
        const result = scheduleWindow(transport, (window + 1) * 0.1);
        for (const note of result.notes) last = note.startBeat;
        transport = result.next;
    }
    // 1 second at 1000 beats/second in 0.1-beat steps: the last onset in
    // [0, 1000) should be within float-noise of 999.9.
    expect(last).toBeCloseTo(999.9, 6);
});

test('a splice lands at the next beat boundary and keeps phase', () => {
    const before = music([track([1, 2, 3, 4], { loop: true })]);
    const after = music([track([5, 6, 7, 8], { loop: true })]);
    let transport = createTransport(before, 0);
    // Play through beat 1.4, then edit the melody.
    const played = scheduleWindow(transport, 1.4);
    transport = requestSplice(played.next, after, 1.4);
    expect(transport.pending?.atBeat).toBe(2);
    const rest = scheduleWindow(transport, 4.5);
    // Old data owns beats < 2; new data resumes at beat 2 with its third
    // note — phase preserved, not restarted.
    expect(
        rest.notes.map((note) => [note.startBeat, note.degree]),
    ).toEqual([
        [2, 7],
        [3, 8],
        [4, 5],
    ]);
});

test('a tempo splice keeps beatAt continuous at the boundary', () => {
    const slow = music([track([1], { loop: true })], { tempo: 60 });
    const fast = music([track([1], { loop: true })], { tempo: 120 });
    let transport = createTransport(slow, 0);
    transport = requestSplice(transport, fast, 0.5);
    const result = scheduleWindow(transport, 3);
    // Boundary at beat 1 = second 1; after it, beats take 0.5s.
    expect(beatAt(result.next, 1)).toBeCloseTo(1, 10);
    expect(beatAt(result.next, 2)).toBeCloseTo(3, 10);
    expect(timeOfBeat(result.next, 3)).toBeCloseTo(2, 10);
});

test('draining music finishes; looping music reports unfinished', () => {
    const oneShot = createTransport(music([track([1, 2])]), 0);
    const done = scheduleWindow(drain(oneShot), 10);
    expect(done.finished).toBe(true);
    const looper = createTransport(music([track([1], { loop: true })]), 0);
    expect(scheduleWindow(drain(looper), 10).finished).toBe(false);
});

test('beat ticks carry counts, audible times, and sounding instruments', () => {
    const data = music([
        track([1, null], { loop: true }),
        track([null, 1], { loop: true, instrument: 'drums' }),
    ]);
    const { beats } = scheduleWindow(createTransport(data, 5), 9);
    expect(beats.map((tick) => tick.count)).toEqual([0, 1, 2, 3]);
    expect(beats[0].time).toBe(5);
    expect(beats[0].instruments).toEqual(['piano']);
    expect(beats[1].instruments).toEqual(['drums']);
});

test('reconcile: keep on identical, splice on change, restart on replay each evaluation', () => {
    const data = music([track([1, 2, 3])]);
    const live = new Map([[data.name, { data, draining: false }]]);
    expect(reconcile(live, [data]).get('song')?.kind).toBe('keep');

    const edited = music([track([1, 2, 4])]);
    expect(reconcile(live, [edited]).get('song')?.kind).toBe('splice');
    expect(signatureOf(data)).not.toBe(signatureOf(edited));

    // Two consecutive evaluations each delivering ⊤ restart twice: replay is
    // per-evaluation, with no edge detection (the two-right-answers case).
    const replaying = music([track([1, 2, 3])], { replay: true });
    expect(reconcile(live, [replaying]).get('song')?.kind).toBe('restart');
    expect(reconcile(live, [replaying]).get('song')?.kind).toBe('restart');
});

test('reconcile: exits stop loops, drain one-shots; entries start', () => {
    const looping = music([track([1], { loop: true })]);
    const oneShot = music([track([1])], { name: 'ding' });
    const live = new Map([
        ['song', { data: looping, draining: false }],
        ['ding', { data: oneShot, draining: false }],
    ]);
    const decisions = reconcile(live, []);
    expect(decisions.get('song')?.kind).toBe('stop');
    expect(decisions.get('ding')?.kind).toBe('drain');
    // A new name starts.
    expect(
        reconcile(new Map(), [oneShot]).get('ding')?.kind,
    ).toBe('start');
    // Re-entry while draining interrupts rather than layering.
    const draining = new Map([['ding', { data: oneShot, draining: true }]]);
    expect(reconcile(draining, [oneShot]).get('ding')?.kind).toBe('restart');
});

test('voice stealing: none under cap; released, then quietest, then oldest', () => {
    const voice = (id: number, options: Partial<Voice> = {}): Voice => ({
        id,
        music: 'song',
        startTime: id,
        velocity: 1,
        released: false,
        ...options,
    });
    expect(chooseSteal([voice(1)], 32)).toBeUndefined();
    // At cap: a released voice goes first even if louder.
    const released = voice(1, { released: true, velocity: 1 });
    const quiet = voice(2, { velocity: 0.1 });
    expect(chooseSteal([released, quiet], 2)?.id).toBe(1);
    // No released: quietest.
    expect(chooseSteal([voice(1), quiet], 2)?.id).toBe(2);
    // Tie on velocity: oldest.
    expect(chooseSteal([voice(3), voice(2)], 2)?.id).toBe(2);
});
