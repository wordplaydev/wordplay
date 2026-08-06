import { expect, test } from 'vitest';
import type { MusicData, TrackData } from '@output/Music/musicData';
import {
    firstSoundingBeat,
    indexAtBeat,
    signatureOf,
} from '@output/Music/musicData';
import {
    beatAt,
    createTransport,
    drain,
    requestSplice,
    seekTransport,
    timeOfBeat,
} from '@output/Music/transport';
import { pickupNotes, scheduleWindow } from '@output/Music/schedule';
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
        mash: true,
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
        pause: false,
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

test('beat ticks carry every track as a part, sounding or not', () => {
    const data = music([
        track([1, null], { loop: true }),
        track([null, 1], { loop: true, instrument: 'drums' }),
    ]);
    const { beats } = scheduleWindow(createTransport(data, 0), 2);

    // One part per track, in track order, whether or not it is sounding.
    expect(beats[0].parts.length).toBe(2);
    expect(beats[0].parts.map((part) => part.instrument)).toEqual([
        'piano',
        'drums',
    ]);
    // Beat 0: the piano sounds, the drums rest.
    expect(beats[0].parts.map((part) => part.sounding)).toEqual([true, false]);
    expect(beats[0].parts[0].degrees).toEqual([1]);
    expect(beats[0].parts[1].degrees).toEqual([]);
    // A resting part reports no loudness, so sizing by volume goes to zero.
    expect(beats[0].parts[1].volume).toBe(0);
    // Beat 1: they swap.
    expect(beats[1].parts.map((part) => part.sounding)).toEqual([false, true]);

    // Music-level state rides along on every beat.
    expect(beats[0].tempo).toBe(60);
    expect(beats[0].volume).toBe(1);
    expect(beats[0].key).toBe(0);
    expect(beats[0].scale).toEqual([0, 2, 4, 5, 7, 9, 11]);
});

test('a part reports a held note through the beats it sustains', () => {
    // One note lasting four beats: it is sounding on all of them, not only
    // the beat it began on, so a visualization can hold while it rings.
    const held = track([1]);
    held.notes.forEach((note) => (note.beats = 4));
    const { beats } = scheduleWindow(createTransport(music([held]), 0), 4);
    expect(beats.map((tick) => tick.parts[0].sounding)).toEqual([
        true,
        true,
        true,
        true,
    ]);
    expect(beats[3].parts[0].degrees).toEqual([1]);
});

test('a part resolves chords and honors a track key and scale override', () => {
    const chord = track([1]);
    chord.notes[0].degrees = [1, 3, 5];
    // A track shifted an octave down, on the minor scale.
    const shifted = track([1], {
        key: -12,
        scale: [0, 2, 3, 5, 7, 8, 10],
        instrument: 'bell',
    });
    const { beats } = scheduleWindow(
        createTransport(music([chord, shifted]), 0),
        1,
    );
    const [first, second] = beats[0].parts;
    // A chord yields every degree, and a pitch for each.
    expect(first.degrees).toEqual([1, 3, 5]);
    expect(first.pitch).toEqual([0, 4, 7]);
    // The override is what the part reports, not the music's own values.
    expect(second.key).toBe(-12);
    expect(second.scale).toEqual([0, 2, 3, 5, 7, 8, 10]);
    expect(second.pitch).toEqual([-12]);
    // The music's own key and scale are still readable alongside.
    expect(beats[0].key).toBe(0);
});

test('reconcile: keep on identical, splice on change, restart on replay each evaluation', () => {
    const data = music([track([1, 2, 3])]);
    const live = new Map([[data.name, { data, draining: false, finished: false }]]);
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
        ['song', { data: looping, draining: false, finished: false }],
        ['ding', { data: oneShot, draining: false, finished: false }],
    ]);
    const decisions = reconcile(live, []);
    expect(decisions.get('song')?.kind).toBe('stop');
    expect(decisions.get('ding')?.kind).toBe('drain');
    // A new name starts.
    expect(
        reconcile(new Map(), [oneShot]).get('ding')?.kind,
    ).toBe('start');
    // Re-entry while draining interrupts rather than layering.
    const draining = new Map([['ding', { data: oneShot, draining: true, finished: false }]]);
    expect(reconcile(draining, [oneShot]).get('ding')?.kind).toBe('restart');
});

test('reconcile: a finished one-shot stays silent through later evaluations', () => {
    // The reported sequence: choose 'right' (it plays), let it finish, then
    // choose 'wrong'. That second choice is just another evaluation carrying
    // the same music with replay ⊥, and it must not sound again.
    const oneShot = music([track([1])], { name: 'ding' });
    const finished = new Map([
        ['ding', { data: oneShot, draining: false, finished: true }],
    ]);
    expect(reconcile(finished, [oneShot]).get('ding')?.kind).toBe('keep');
    // Any number of further evaluations stay silent too.
    expect(reconcile(finished, [oneShot]).get('ding')?.kind).toBe('keep');

    // But editing it sounds it again, with the edit.
    const edited = music([track([1, 5])], { name: 'ding' });
    expect(reconcile(finished, [edited]).get('ding')?.kind).toBe('restart');

    // replay is still the way to sound it again unedited.
    const replaying = music([track([1])], { name: 'ding', replay: true });
    expect(reconcile(finished, [replaying]).get('ding')?.kind).toBe('restart');

    // Leaving the stage forgets it, so coming back is a fresh start rather
    // than a silent keep.
    expect(reconcile(finished, []).get('ding')?.kind).toBe('stop');
});

test('reconcile: a one-shot edited mid-play splices rather than restarting', () => {
    // Still sounding, so the edit joins what is playing and it plays out —
    // it does not jump back to the top. Only an edit after it has finished
    // sounds it again from the start.
    const oneShot = music([track([1, 2, 3])], { name: 'ding' });
    const playing = new Map([
        ['ding', { data: oneShot, draining: false, finished: false }],
    ]);
    const edited = music([track([1, 2, 4])], { name: 'ding' });
    expect(reconcile(playing, [edited]).get('ding')?.kind).toBe('splice');

    // A loop edited mid-play splices too, which is what makes dynamic music
    // dynamic: it keeps its beat and changes which notes are played.
    const loop = music([track([1, 2, 3], { loop: true })]);
    const looping = new Map([
        ['song', { data: loop, draining: false, finished: false }],
    ]);
    const loopEdited = music([track([1, 2, 4], { loop: true })]);
    expect(reconcile(looping, [loopEdited]).get('song')?.kind).toBe('splice');
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

test('seekTransport at beat zero is exactly a fresh transport', () => {
    // The two ways of getting cursors — createCursor per track, and cursorsAt
    // at a boundary — have to agree at the top, or resuming to 0 would differ
    // from starting at 0 for reasons nobody could see.
    for (const tracks of [
        [track([1, 2, 3], { loop: true })],
        [track([1, 2, 3], { loop: false })],
        [track([], { loop: true })],
        [track([1, 2], { loop: true }), track([3], { loop: false })],
    ]) {
        const data = music(tracks);
        expect(seekTransport(createTransport(data, 10), 0, 10, 0)).toEqual(
            createTransport(data, 10),
        );
    }
});

test('seekTransport re-anchors the clock without moving the beat', () => {
    const data = music([track([1, 2, 3, 4], { loop: true })]);
    const started = createTransport(data, 10);
    // Frozen at beat 2.5, picked up twenty seconds of wall clock later.
    const resumed = seekTransport(started, 2.5, 30, 3);
    expect(beatAt(resumed, 30)).toBeCloseTo(2.5);
    // At 60bpm one beat is one second, so the next second is beat 3.5.
    expect(beatAt(resumed, 31)).toBeCloseTo(3.5);
    // The cursor sits on the first onset at or after the resume point.
    expect(resumed.cursors[0]).toEqual({
        index: 3,
        iteration: 0,
        done: false,
    });
    expect(resumed.beatCount).toBe(3);
});

test('seekTransport keeps a splice queued across the pause', () => {
    const data = music([track([1, 2, 3, 4], { loop: true })]);
    const edited = music([track([5, 6, 7, 8], { loop: true })]);
    const queued = requestSplice(createTransport(data, 10), edited, 10.5);
    // Its old boundary is behind the resume point, so it lands on the next one.
    const resumed = seekTransport(queued, 6.25, 100, 7);
    expect(resumed.pending?.data).toBe(edited);
    expect(resumed.pending?.atBeat).toBe(7);
});

test('seeking preserves loop phase across an iteration boundary', () => {
    const data = music([track([1, 2, 3], { loop: true })]);
    const resumed = seekTransport(createTransport(data, 0), 7.5, 0, 8);
    // Beat 7.5 is 1.5 into the third pass, so the next onset is index 2 of it.
    expect(resumed.cursors[0]).toEqual({
        index: 2,
        iteration: 2,
        done: false,
    });
});

test('a pickup plays out what was left of the note that was cut', () => {
    // A held chord is why this exists: resuming at the next onset alone would
    // drop it and leave a hole where the pad was.
    const held = music([
        {
            ...track([1]),
            notes: [{ degrees: [1, 3, 5], beats: 4, volume: 1 }],
            loop: true,
        },
    ]);
    const notes = pickupNotes(held, 1, 100);
    expect(notes.length).toBe(3);
    expect(notes[0].startBeat).toBe(1);
    expect(notes[0].startTime).toBe(100);
    // Four beats long, one beat heard, three left.
    expect(notes[0].durationBeats).toBeCloseTo(3);
    expect(notes.map((note) => note.degree)).toEqual([1, 3, 5]);
});

test('a pickup is silent when there is nothing left over to play', () => {
    const data = music([track([1, 2, 3], { loop: true })]);
    // Exactly on an onset: the scheduler has that note, so re-striking it here
    // would sound it twice.
    expect(pickupNotes(data, 1, 0)).toEqual([]);
    // A rest covers the beat.
    expect(pickupNotes(music([track([1, null, 3], { loop: true })]), 1.5, 0))
        .toEqual([]);
    // A non-looping track that has already run out.
    expect(pickupNotes(music([track([1, 2], { loop: false })]), 5, 0)).toEqual(
        [],
    );
});

test('a pickup resolves pitch and velocity the way the scheduler does', () => {
    // The point of sharing the builder: a picked-up note must not be a
    // differently-tuned or differently-loud copy of a scheduled one.
    const data = music([track([3], { key: 5, volume: 0.5, pan: -1 })], {
        volume: 0.5,
    });
    const scheduled = scheduleWindow(createTransport(data, 0), 10).notes[0];
    const picked = pickupNotes(data, 0.5, 0)[0];
    expect(picked.semitones).toBe(scheduled.semitones);
    expect(picked.velocity).toBe(scheduled.velocity);
    expect(picked.pan).toBe(scheduled.pan);
    expect(picked.instrument).toBe(scheduled.instrument);
});

test('pause is not content, so holding a music is never an edit', () => {
    // If it were in the signature, un-pausing would read as a change and
    // request a splice measured from a frozen origin.
    const playing = music([track([1, 2, 3])]);
    expect(signatureOf({ ...playing, pause: true })).toBe(signatureOf(playing));
});

test('a mashed fraction schedules both neighbors at one beat', () => {
    const data = music([track([1.2])]);
    const notes = scheduleWindow(createTransport(data, 0), 10).notes;
    expect(notes).toHaveLength(2);
    expect(notes.map((note) => note.startBeat)).toEqual([0, 0]);
    expect(notes.map((note) => note.semitones)).toEqual([0, 2]);
    // Equal power, so the pair is as loud as the whole note beside it.
    expect(
        notes.reduce((total, note) => total + note.velocity ** 2, 0),
    ).toBeCloseTo(1, 10);
    expect(notes[0].velocity).toBeGreaterThan(notes[1].velocity);
});

test('an unmashed fraction schedules one note bent off pitch', () => {
    const notes = scheduleWindow(
        createTransport(music([track([1.2], { mash: false })]), 0),
        10,
    ).notes;
    expect(notes).toHaveLength(1);
    expect(notes[0].semitones).toBeCloseTo(0.4, 10);
    expect(notes[0].velocity).toBe(1);
});

test('mashing scales velocity by the track and music volumes too', () => {
    // The weight multiplies the existing chain rather than replacing it.
    const data = music([track([1.5], { volume: 0.5 })], { volume: 0.5 });
    const notes = scheduleWindow(createTransport(data, 0), 10).notes;
    expect(notes).toHaveLength(2);
    for (const note of notes)
        expect(note.velocity).toBeCloseTo(0.25 * Math.SQRT1_2, 10);
});

test('a picked-up fraction sounds the same voices as a scheduled one', () => {
    const data = music([track([1.2], { key: 5 })]);
    const scheduled = scheduleWindow(createTransport(data, 0), 10).notes;
    const picked = pickupNotes(data, 0.5, 0);
    expect(picked.map((note) => note.semitones)).toEqual(
        scheduled.map((note) => note.semitones),
    );
    expect(picked.map((note) => note.velocity)).toEqual(
        scheduled.map((note) => note.velocity),
    );
});

test('a whole degree still schedules exactly one note', () => {
    // The guard on everything above: mashing must cost existing music nothing.
    for (const mash of [true, false])
        expect(
            scheduleWindow(
                createTransport(music([track([1, 2, 3], { mash })]), 0),
                10,
            ).notes,
        ).toHaveLength(3);
});

test('a beat reads back as the entry it lands in', () => {
    // The inverse of noteOnset, for turning a click on the staff into a place
    // in the note list.
    const t = track([1, 2, 3]);
    expect(indexAtBeat(t, 0)).toBe(0);
    expect(indexAtBeat(t, 0.5)).toBe(0);
    expect(indexAtBeat(t, 1)).toBe(1);
    expect(indexAtBeat(t, 2.99)).toBe(2);
    // Past the end answers the length, so every beat reads as "insert here"
    // including the one after the last note.
    expect(indexAtBeat(t, 3)).toBe(3);
    expect(indexAtBeat(t, 99)).toBe(3);
    expect(indexAtBeat(t, -1)).toBe(0);
    expect(indexAtBeat(track([]), 0)).toBe(0);
});

test('a held note owns every beat it sustains', () => {
    // Clicking the middle of a whole note is clicking that note, not the
    // silence a naive onset comparison would put there.
    const held = track([1, 2]);
    const long = {
        ...held,
        notes: [{ degrees: [1], beats: 4, volume: 1 }, held.notes[1]],
    };
    expect(indexAtBeat(long, 0)).toBe(0);
    expect(indexAtBeat(long, 3.9)).toBe(0);
    expect(indexAtBeat(long, 4)).toBe(1);
});

test('a track that enters late reports where it actually starts', () => {
    // An imported piece is full of these: every instrument entering after the
    // opening carries a rest as long as its wait, and one entering in the last
    // chorus opens with hundreds of beats of silence. Showing or playing from
    // beat 0 there is an empty staff and a long silence.
    const late = track([null, null, 3, 4]);
    expect(firstSoundingBeat(late)).toBe(2);
    expect(firstSoundingBeat(track([1, 2]))).toBe(0);
    // A track of nothing but rests has no first note to find.
    expect(firstSoundingBeat(track([null, null]))).toBeUndefined();
    expect(firstSoundingBeat(track([]))).toBeUndefined();
});

test('a late entry is measured in beats, not entries', () => {
    // The rest the importer writes is one entry however long it is.
    const t = track([null, 5]);
    const long = { ...t, notes: [{ ...t.notes[0], beats: 40 }, t.notes[1]] };
    expect(firstSoundingBeat(long)).toBe(40);
});
