import { expect, test } from 'vitest';
import transcribe, {
    degreeFor,
    fit,
    segment,
    tempoOf,
    toMIDI,
    type Frame,
    MinNoteMs,
} from '@output/Music/transcribe';
import { Scales } from '@output/Music/scales';

/** Hz for a MIDI note, the inverse of what the detector reports. */
function hz(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Frames at 50ms, the Pitch stream's default rate.
 *
 * Deliberately *detuned*. Frames at exact `hz(midi)` sit precisely on a major
 * degree, which is the one input where the scale fit's old bias was invisible:
 * chromatic tied instead of winning and lost the tie to major. A voice is never
 * exact, so neither is this — the offsets are fixed rather than random, so a
 * failure is reproducible.
 */
function sing(
    parts: { midi: number | null; ms: number; level?: number }[],
    rate = 50,
): Frame[] {
    const frames: Frame[] = [];
    let at = 0;
    let index = 0;
    // A few cents either way, cycling, so no note lands exactly on its pitch.
    const wobble = [0.08, -0.11, 0.05, -0.06, 0.12, -0.09];
    for (const part of parts)
        for (let elapsed = 0; elapsed < part.ms; elapsed += rate) {
            const off = wobble[index++ % wobble.length];
            frames.push({
                hz: part.midi === null ? 0 : hz(part.midi + off),
                at,
                // Silence is silent; singing is loud unless a test says else.
                level: part.midi === null ? 0 : (part.level ?? 1),
            });
            at += rate;
        }
    return frames;
}

test('Hz reads back as the note it came from', () => {
    expect(toMIDI(440)).toBeCloseTo(69, 10);
    expect(toMIDI(hz(60))).toBeCloseTo(60, 10);
    expect(toMIDI(hz(72)) - toMIDI(hz(60))).toBeCloseTo(12, 10);
});

test('a steady hum is one note', () => {
    const notes = segment(sing([{ midi: 60, ms: 600 }]));
    expect(notes).toHaveLength(1);
    // Loose, because `sing` detunes: a voice does not hold a pitch exactly.
    expect(notes[0].pitch).toBeCloseTo(60, 0);
    expect(notes[0].ms).toBeGreaterThanOrEqual(500);
});

test('silence between notes separates them', () => {
    const notes = segment(
        sing([
            { midi: 60, ms: 400 },
            { midi: null, ms: 300 },
            { midi: 64, ms: 400 },
        ]),
    );
    expect(notes).toHaveLength(2);
    expect(notes.map((n) => Math.round(n.pitch))).toEqual([60, 64]);
});

test('a change of pitch separates notes even without a gap', () => {
    // Singing legato is normal; a note change is not always a silence.
    const notes = segment(
        sing([
            { midi: 60, ms: 400 },
            { midi: 67, ms: 400 },
        ]),
    );
    expect(notes).toHaveLength(2);
    expect(notes.map((n) => Math.round(n.pitch))).toEqual([60, 67]);
});

test('a flicker of silence does not break a held note', () => {
    // The detector loses confidence on almost every vowel change; treating
    // that as a note boundary would chop a word into syllables.
    const notes = segment(
        sing([
            { midi: 60, ms: 300 },
            { midi: null, ms: 50 },
            { midi: 60, ms: 300 },
        ]),
    );
    expect(notes).toHaveLength(1);
});

test('a blip too short to be sung is dropped', () => {
    const notes = segment(
        sing([
            { midi: 60, ms: MinNoteMs / 2 },
            { midi: null, ms: 300 },
            { midi: 67, ms: 400 },
        ]),
    );
    expect(notes.map((n) => Math.round(n.pitch))).toEqual([67]);
});

test('an unsteady voice is still one note', () => {
    // Real singing wobbles; a note that wandered a third of a semitone must
    // not come out as a run of separate notes.
    const frames: Frame[] = [];
    for (let i = 0; i < 12; i++)
        frames.push({
            hz: hz(60 + (i % 2 === 0 ? 0.3 : -0.3)),
            at: i * 50,
            level: 1,
        });
    expect(segment(frames)).toHaveLength(1);
});

test('silence alone transcribes to nothing', () => {
    expect(transcribe(sing([{ midi: null, ms: 1000 }]))).toBeUndefined();
    expect(transcribe([])).toBeUndefined();
});

test('the shortest note becomes the beat', () => {
    // 500ms shortest → 120bpm, so a row of even notes comes out as quarters.
    expect(tempoOf([{ pitch: 60, at: 0, ms: 500, level: 1 }])).toBe(120);
    expect(tempoOf([{ pitch: 60, at: 0, ms: 1000, level: 1 }])).toBe(60);
    // Clamped to what a person can hum, so one stray blip can't imply 900bpm.
    expect(tempoOf([{ pitch: 60, at: 0, ms: 10, level: 1 }])).toBe(240);
    expect(tempoOf([])).toBe(120);
});

test('a major melody is fitted to a major scale', () => {
    // Do-re-mi-fa-sol: only the major scale contains all of these.
    const sung = [0, 2, 4, 5, 7].map((step, i) => ({
        pitch: 60 + step,
        at: i * 500,
        ms: 500,
        level: 1,
    }));
    const { scale, key } = fit(sung);
    expect(Scales[scale].length).toBeGreaterThan(0);
    // Whatever it picks, every sung pitch must land on a degree of it.
    for (const note of sung) {
        const relative = note.pitch - 60 - key;
        const octave = ((relative % 12) + 12) % 12;
        const distances = Scales[scale].map((offset) =>
            Math.min(Math.abs(octave - offset), Math.abs(octave - offset - 12)),
        );
        expect(Math.min(...distances)).toBeLessThan(0.5);
    }
});

test('a degree is found for any pitch in any scale', () => {
    for (const scale of [Scales.major, Scales.minor, Scales.pentatonic])
        for (let semitones = -12; semitones <= 24; semitones++) {
            const degree = degreeFor(60 + semitones, 60, scale, 0);
            expect(Number.isFinite(degree)).toBe(true);
            expect(Number.isInteger(degree)).toBe(true);
        }
});

test('a hummed melody comes out as notes in order', () => {
    const result = transcribe(
        sing([
            { midi: 60, ms: 500 },
            { midi: null, ms: 150 },
            { midi: 62, ms: 500 },
            { midi: null, ms: 150 },
            { midi: 64, ms: 500 },
        ]),
    );
    expect(result).toBeDefined();
    const sounding = result?.notes.filter((n) => n.degrees.length > 0) ?? [];
    expect(sounding).toHaveLength(3);
    // Rising in pitch means rising in degree, whatever scale was chosen.
    const degrees = sounding.map((n) => n.degrees[0]);
    expect(degrees[0]).toBeLessThan(degrees[1]);
    expect(degrees[1]).toBeLessThan(degrees[2]);
    // The lowest note sung is degree 1, so it lands where it was sung.
    expect(degrees[0]).toBe(1);
});

test('a pause becomes a rest, and trailing silence does not', () => {
    const result = transcribe(
        sing([
            { midi: 60, ms: 500 },
            { midi: null, ms: 1000 },
            { midi: 60, ms: 500 },
            // The silence after the last note is reaching for the stop button.
            { midi: null, ms: 2000 },
        ]),
    );
    const kinds = result?.notes.map((n) => n.degrees.length > 0) ?? [];
    expect(kinds).toEqual([true, false, true]);
});

test('every transcribed note is playable', () => {
    // Whatever the pipeline decides, it must not produce a note the player
    // would reject: a length has to be positive and a volume in range.
    const result = transcribe(
        sing([
            { midi: 55, ms: 300 },
            { midi: null, ms: 200 },
            { midi: 67, ms: 900 },
            { midi: 62, ms: 400 },
        ]),
    );
    for (const note of result?.notes ?? []) {
        expect(note.beats).toBeGreaterThan(0);
        expect(note.volume).toBeGreaterThan(0);
        expect(note.volume).toBeLessThanOrEqual(1);
        for (const degree of note.degrees)
            expect(Number.isFinite(degree)).toBe(true);
    }
    expect(result?.tempo).toBeGreaterThan(0);
});

/* ------------------------------------------------- the live preview */

test('a take in progress reads back as the notes sung so far', () => {
    // What the recording studio shows while you are still singing: it calls
    // this on a throttle with the frames it has, so a partial take has to be a
    // sensible transcription rather than nothing or a mess.
    const frames = sing([
        { midi: 60, ms: 400 },
        { midi: null, ms: 200 },
        { midi: 64, ms: 400 },
        { midi: null, ms: 200 },
        { midi: 67, ms: 400 },
    ]);

    const half = transcribe(frames.slice(0, Math.floor(frames.length / 2)));
    const whole = transcribe(frames);
    expect(half).toBeDefined();
    expect(whole).toBeDefined();

    const sounded = (t: typeof whole) =>
        (t?.notes ?? []).filter((note) => note.degrees.length > 0);
    expect(sounded(half).length).toBeGreaterThan(0);
    expect(sounded(half).length).toBeLessThan(sounded(whole).length);
});

test('a take never opens with a rest, however long the silence before it', () => {
    // The property the preview leans on: silence before the first note is the
    // creator reaching for the button, not a rest they sang.
    for (const before of [0, 500, 3000]) {
        const notes =
            transcribe(
                sing([
                    { midi: null, ms: before },
                    { midi: 60, ms: 400 },
                    { midi: null, ms: 200 },
                    { midi: 64, ms: 400 },
                ]),
            )?.notes ?? [];
        expect(notes.length, `${before}ms of silence first`).toBeGreaterThan(0);
        expect(
            notes[0].degrees.length,
            `${before}ms of silence first`,
        ).toBeGreaterThan(0);
    }
});

/* ------------------------------------------------- the tune, end to end */

/** The opening of Happy Birthday: sol sol la sol do si, sung on B. */
const HappyBirthday = [59, 59, 61, 59, 64, 63];

/** Its intervals, which are what make it recognizable at any pitch. */
const HappyBirthdayIntervals = [0, 2, -2, 5, -1];

test('a hummed tune comes back as that tune', () => {
    // The complaint this whole thing is for: humming Happy Birthday came back
    // as a scatter of notes. Intervals rather than degrees, because which note
    // is degree 1 depends on the tonic rule, but the *shape* is the tune.
    //
    // Syllables, so repeated notes are separated by the dip between them the
    // way real singing separates them — nothing in the pitch track can.
    const parts: { midi: number | null; ms: number; level?: number }[] = [];
    for (const midi of HappyBirthday) {
        parts.push({ midi, ms: 400 });
        parts.push({ midi, ms: 150, level: 0.05 });
    }
    const notes = segment(sing(parts));

    expect(notes).toHaveLength(HappyBirthday.length);
    const intervals = notes
        .slice(1)
        .map((note, i) => Math.round(note.pitch - notes[i].pitch));
    expect(intervals).toEqual(HappyBirthdayIntervals);
});

test('a syllable separates two notes; a wobble inside one does not', () => {
    // Two notes a semitone apart, sung as two syllables. The pitch tolerance
    // is deliberately wider than a semitone — narrowing it so the *pitch*
    // could separate them made a real take worse, because every semitone a
    // slide passes through then settles long enough to be written down. The
    // dip between syllables is what separates them.
    const step = segment(
        sing([
            { midi: 64, ms: 400 },
            { midi: 64, ms: 150, level: 0.05 },
            { midi: 63, ms: 400 },
        ]),
    );
    expect(step.map((n) => Math.round(n.pitch))).toEqual([64, 63]);

    // And a voice wandering inside one held note stays one note.
    const wobbling: Frame[] = [];
    for (let i = 0; i < 20; i++)
        wobbling.push({
            hz: hz(64 + (i % 2 === 0 ? 0.5 : -0.5)),
            at: i * 50,
            level: 1,
        });
    expect(segment(wobbling)).toHaveLength(1);
});

test('a slide between two notes is not a run of notes', () => {
    // The "lots of random notes" failure: a voice sliding from D down to B
    // passes through C# and C, and each lingers long enough to look like a
    // note. A move counts only once the voice *settles* somewhere — across
    // three frames, since any two frames of a slide sit close enough to look
    // settled — so the slide belongs to the note it is leaving.
    const notes = segment(
        sing([
            { midi: 62, ms: 400 },
            // The slide down, two frames a step.
            { midi: 61.4, ms: 100 },
            { midi: 60.6, ms: 100 },
            { midi: 59.8, ms: 100 },
            { midi: 59, ms: 400 },
        ]),
    );
    expect(notes.map((n) => Math.round(n.pitch))).toEqual([62, 59]);
});

test('breath and room noise are not notes', () => {
    // The detector reports confident pitches in near-silence — on a real take,
    // two octaves below the melody at clarities up to 0.977. Loudness is what
    // separates them; clarity does not.
    const notes = segment(
        sing([
            { midi: 33, ms: 300, level: 0.04 },
            { midi: 59, ms: 500 },
            { midi: 31, ms: 300, level: 0.03 },
            { midi: 61, ms: 500 },
        ]),
    );
    expect(notes.map((n) => Math.round(n.pitch))).toEqual([59, 61]);
});

test('a quiet interloper cannot decide the tonic or the tempo', () => {
    // Why the noise matters beyond a stray note: the lowest note sets the
    // tonic and the shortest sets the tempo, so one invented note moves every
    // degree and every duration in the transcription.
    const clean = transcribe(
        sing([
            { midi: 59, ms: 500 },
            { midi: 61, ms: 500 },
        ]),
    );
    const noisy = transcribe(
        sing([
            { midi: 31, ms: 100, level: 0.03 },
            { midi: 59, ms: 500 },
            { midi: 61, ms: 500 },
        ]),
    );
    expect(noisy?.tempo).toBe(clean?.tempo);
    expect(noisy?.notes.map((n) => n.degrees)).toEqual(
        clean?.notes.map((n) => n.degrees),
    );
});

test('a tune in a key is fitted to that key, not to every semitone', () => {
    // Chromatic's degrees are every semitone — a superset of every other
    // scale's — so on distance alone it can never lose, and nothing ever gets
    // snapped to a key. A wobbling voice then writes a different note for
    // every wobble, which is the whole complaint.
    //
    // The note at +1 is the one that matters: it is off the major scale, so
    // chromatic explains it perfectly and major does not. Without a price on
    // extra degrees, that single note is enough to take the whole melody
    // chromatic and unsnap the other five.
    const mostlyMajor = [0, 2, 4, 5, 7, 1];
    const fitted = fit(
        mostlyMajor.map((step, i) => ({
            pitch: 60 + step,
            at: i * 500,
            ms: 500,
            level: 1,
        })),
    );
    expect(fitted.scale).not.toBe('chromatic');
});

test('but a tune that needs every semitone still gets chromatic', () => {
    // The penalty must be earnable, not a ban: a melody that uses pitches no
    // smaller scale has is not a diatonic tune and should not be bent into one.
    const chromaticRun = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];
    const fitted = fit(
        chromaticRun.map((midi, i) => ({
            pitch: midi,
            at: i * 500,
            ms: 500,
            level: 1,
        })),
    );
    expect(fitted.scale).toBe('chromatic');
});

test('a long note counts for more than one passed through', () => {
    // A slide touches pitches nobody sang, and a blip is not evidence about
    // the key. The same five pitches should be read differently depending on
    // whether the off-scale one was held or passed through.
    const pitches = [60, 62, 64, 67, 61];
    const at = (i: number) => i * 500;

    const passed = fit(
        pitches.map((pitch, i) => ({
            pitch,
            at: at(i),
            // The last one, off the scale, is a blip.
            ms: i === pitches.length - 1 ? 50 : 1000,
            level: 1,
        })),
    );
    const held = fit(
        pitches.map((pitch, i) => ({
            pitch,
            at: at(i),
            // ...and here it is held longer than anything else.
            ms: i === pitches.length - 1 ? 3000 : 1000,
            level: 1,
        })),
    );

    // Held, it has to be accounted for; passed through, it does not.
    expect(passed.scale).not.toBe(held.scale);
});
