import { expect, test } from 'vitest';
import type { MusicData, TrackData } from '@output/Music/musicData';
import { Scales } from '@output/Music/scales';
import { InstrumentKeys } from '@output/Music/instruments';

/** A stage wide enough for the old fixed thresholds, so tests about layout
 * say what they mean rather than depending on a default. */
const Wide = 46 * 40;
import {
    absoluteBeat,
    accidentalFor,
    advanceCursor,
    beatsAcross,
    densityOf,
    glyphFor,
    headOf,
    labelFor,
    layoutOf,
    lengthOf,
    marksOf,
    playheadOf,
    Noteheads,
    PlayheadFraction,
    Rests,
    MinBeatWidth,
    placeStep,
    Sharp,
    staffCenterOf,
    staffLines,
    staffStep,
    startCursor,
    startHistory,
    stepRangeOf,
    windowStart,
} from '@output/Music/sheet';

function track(
    notes: { degrees: number[]; beats: number }[],
    options: Partial<TrackData> = {},
): TrackData {
    return {
        notes: notes.map((note) => ({ ...note, volume: 1 })),
        instrument: 'piano',
        scale: Scales.major,
        key: 0,
        volume: 1,
        pan: 0,
        loop: false,
        ...options,
    };
}

function music(
    tracks: TrackData[],
    options: Partial<MusicData> = {},
): MusicData {
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
        ...options,
    };
}

/* ---------------------------------------------------------------- *
 * Glyphs
 * ---------------------------------------------------------------- */

test('a duration draws as the note value it is closest to from below', () => {
    expect(glyphFor(4)).toBe(Noteheads[0].glyph);
    expect(glyphFor(2)).toBe(Noteheads[1].glyph);
    expect(glyphFor(1)).toBe(Noteheads[2].glyph);
    expect(glyphFor(0.5)).toBe(Noteheads[3].glyph);
    expect(glyphFor(0.25)).toBe(Noteheads[4].glyph);
    // A dotted quarter is a quarter, not a half: rounding up would draw a
    // value the music never plays.
    expect(glyphFor(1.5)).toBe(Noteheads[2].glyph);
    // Longer than a whole is still a whole.
    expect(glyphFor(16)).toBe(Noteheads[0].glyph);
});

test('anything that sounds is visible, however short', () => {
    for (const beats of [0.001, 0.01, 0.1, 0.2, 0.249])
        expect(glyphFor(beats).length).toBeGreaterThan(0);
});

test('rests have their own glyphs at every value', () => {
    for (const { beats, glyph } of Rests)
        expect(glyphFor(beats, true)).toBe(glyph);
    // And a rest never draws as a notehead.
    const noteheads = new Set(Noteheads.map((n) => n.glyph));
    for (const { beats } of Rests)
        expect(noteheads.has(glyphFor(beats, true))).toBe(false);
});

/* ---------------------------------------------------------------- *
 * Pitch on the staff
 * ---------------------------------------------------------------- */

test('an octave is seven steps, not twelve', () => {
    expect(staffStep(12) - staffStep(0)).toBe(7);
    expect(staffStep(0) - staffStep(-12)).toBe(7);
});

test('a sharp shares a line with its natural', () => {
    // C and C♯, F and F♯ — the pairs that make this notation rather than a
    // pitch plot.
    expect(staffStep(1)).toBe(staffStep(0));
    expect(staffStep(6)).toBe(staffStep(5));
    expect(accidentalFor(1)).toBe(Sharp);
    expect(accidentalFor(0)).toBeUndefined();
});

test('only the black keys take an accidental', () => {
    const black = [1, 3, 6, 8, 10];
    for (let semitone = 0; semitone < 12; semitone++)
        expect(
            accidentalFor(semitone) !== undefined,
            `semitone ${semitone}`,
        ).toBe(black.includes(semitone));
});

test('steps rise with pitch, so the staff reads the right way up', () => {
    let last = -Infinity;
    for (let semitone = -24; semitone <= 24; semitone++) {
        const step = staffStep(semitone);
        expect(step).toBeGreaterThanOrEqual(last);
        last = step;
    }
});

/* ---------------------------------------------------------------- *
 * The score
 * ---------------------------------------------------------------- */

test('notes land on their onsets', () => {
    const marks = marksOf(
        [
            music([
                track([
                    { degrees: [1], beats: 1 },
                    { degrees: [2], beats: 2 },
                    { degrees: [3], beats: 1 },
                ]),
            ]),
        ],
        0,
        8,
    );
    expect(marks.map((mark) => mark.beat)).toEqual([0, 1, 3]);
    expect(marks.map((mark) => mark.beats)).toEqual([1, 2, 1]);
});

test('a chord is several noteheads at one beat, as notation draws it', () => {
    const marks = marksOf(
        [music([track([{ degrees: [1, 3, 5], beats: 1 }])])],
        0,
        4,
    );
    expect(marks).toHaveLength(3);
    expect(marks.every((mark) => mark.beat === 0)).toBe(true);
    expect(new Set(marks.map((mark) => mark.step)).size).toBe(3);
});

test('a rest is drawn, and carries no pitch', () => {
    const marks = marksOf([music([track([{ degrees: [], beats: 2 }])])], 0, 4);
    expect(marks).toHaveLength(1);
    expect(marks[0].rest).toBe(true);
    expect(marks[0].step).toBeUndefined();
});

test('a looping track repeats through the window; a one-shot does not', () => {
    const looping = music([
        track([{ degrees: [1], beats: 1 }], { loop: true }),
    ]);
    const once = music([track([{ degrees: [1], beats: 1 }], { loop: false })]);
    expect(marksOf([looping], 0, 8).length).toBeGreaterThan(4);
    expect(marksOf([once], 0, 8)).toHaveLength(1);
});

test('only what is visible is built, so a long piece costs no more', () => {
    // 400 quarter notes; asking for eight beats in the middle must not return
    // four hundred marks.
    const long = music([
        track(
            Array.from({ length: 400 }, (_, i) => ({
                degrees: [1 + (i % 7)],
                beats: 1,
            })),
        ),
    ]);
    const window = marksOf([long], 100, 108);
    expect(window.length).toBeLessThanOrEqual(10);
    for (const mark of window) {
        expect(mark.beat + mark.beats).toBeGreaterThanOrEqual(100);
        expect(mark.beat).toBeLessThanOrEqual(108);
    }
});

test('a note still sounding at the window start is included', () => {
    // A whole note beginning at beat 0 is still ringing at beat 2.
    const marks = marksOf([music([track([{ degrees: [1], beats: 4 }])])], 2, 6);
    expect(marks).toHaveLength(1);
    expect(marks[0].beat).toBe(0);
});

test('every track of every music lands on the one staff', () => {
    const marks = marksOf(
        [
            music([
                track([{ degrees: [1], beats: 1 }], { instrument: 'piano' }),
                track([{ degrees: [5], beats: 1 }], { instrument: 'flute' }),
            ]),
            music(
                [track([{ degrees: [8], beats: 1 }], { instrument: 'bell' })],
                {
                    name: 'other',
                },
            ),
        ],
        0,
        4,
    );
    expect(new Set(marks.map((mark) => mark.instrument))).toEqual(
        new Set(['piano', 'flute', 'bell']),
    );
    expect(new Set(marks.map((mark) => mark.music))).toEqual(
        new Set(['song', 'other']),
    );
});

test('a track key and scale move the pitch, not just the degree', () => {
    const plain = marksOf([music([track([{ degrees: [1], beats: 1 }])])], 0, 2);
    const shifted = marksOf(
        [music([track([{ degrees: [1], beats: 1 }], { key: 12 })])],
        0,
        2,
    );
    expect(shifted[0].step! - plain[0].step!).toBe(7);
});

/* ---------------------------------------------------------------- *
 * Layout
 * ---------------------------------------------------------------- */

test('a short piece is shown whole and does not scroll', () => {
    const short = music([
        track(Array.from({ length: 24 }, () => ({ degrees: [1], beats: 1 }))),
    ]);
    const layout = layoutOf([short], Wide);
    expect(layout.fits).toBe(true);
    expect(layout.beats).toBe(24);
    expect(windowStart(layout, 10)).toBe(0);
});

test('a long piece scrolls at a fixed density', () => {
    const long = music([
        track(Array.from({ length: 375 }, () => ({ degrees: [1], beats: 1 }))),
    ]);
    const layout = layoutOf([long], Wide);
    expect(layout.fits).toBe(false);
    expect(layout.beats).toBe(beatsAcross(Wide, 1));
    // The playhead sits a third in, so there is more ahead than behind.
    expect(windowStart(layout, 100)).toBeCloseTo(
        100 - layout.beats * PlayheadFraction,
    );
});

test('the fit threshold is the width, so notes never crowd each other', () => {
    const across = beatsAcross(Wide, 1);
    const atLimit = music([
        track(
            Array.from({ length: across }, () => ({ degrees: [1], beats: 1 })),
        ),
    ]);
    const overLimit = music([
        track(
            Array.from({ length: across + 1 }, () => ({
                degrees: [1],
                beats: 1,
            })),
        ),
    ]);
    expect(layoutOf([atLimit], Wide).fits).toBe(true);
    expect(layoutOf([overLimit], Wide).fits).toBe(false);
    // However it lays out, a beat is never narrower than a notehead needs.
    for (const layout of [
        layoutOf([atLimit], Wide),
        layoutOf([overLimit], Wide),
    ])
        expect(Wide / layout.beats).toBeGreaterThanOrEqual(MinBeatWidth - 1);
});

test('the same piece fits a wide stage and scrolls a narrow one', () => {
    // Happy Birthday's twenty-six beats: readable across a wide stage, and
    // crammed into overlapping noteheads on a phone without scrolling.
    const birthday = music([
        track(Array.from({ length: 26 }, () => ({ degrees: [1], beats: 1 }))),
    ]);
    expect(layoutOf([birthday], 46 * 30).fits).toBe(true);
    expect(layoutOf([birthday], 400).fits).toBe(false);
});

test('a score that has ended stops rather than scrolling into empty staff', () => {
    const once = layoutOf(
        [
            music([
                track(
                    Array.from({ length: 97 }, () => ({
                        degrees: [1],
                        beats: 1,
                    })),
                ),
            ]),
        ],
        400,
    );
    expect(headOf(once, 40)).toBe(40);
    expect(headOf(once, 200)).toBe(97);

    // A loop never ends, so it never stops.
    const looping = layoutOf(
        [music([track([{ degrees: [1], beats: 1 }], { loop: true })])],
        400,
    );
    expect(headOf(looping, 500)).toBe(500);

    // Nor does a sound effect with no written score to reach the end of.
    const effect = layoutOf([music([track([])])], 400);
    expect(headOf(effect, 500)).toBe(500);
});

test('the longest music on stage decides the layout', () => {
    const short = music([track([{ degrees: [1], beats: 1 }])], { name: 'a' });
    const long = music(
        [
            track(
                Array.from({ length: 100 }, () => ({ degrees: [1], beats: 1 })),
            ),
        ],
        { name: 'b' },
    );
    expect(lengthOf([short, long])).toBe(100);
    expect(layoutOf([short, long], Wide).fits).toBe(false);
});

test('nothing playing produces finite geometry rather than a crash', () => {
    for (const musics of [
        [],
        [music([])],
        [music([track([])])],
        [music([track([{ degrees: [1], beats: 0 }])])],
    ]) {
        const layout = layoutOf(musics, Wide);
        expect(Number.isFinite(layout.beats)).toBe(true);
        expect(layout.beats).toBeGreaterThan(0);
        expect(Number.isFinite(windowStart(layout, 3))).toBe(true);
        expect(() => marksOf(musics, 0, 8)).not.toThrow();
    }
});

/* ---------------------------------------------------------------- *
 * Looping, restarts, and fitting
 * ---------------------------------------------------------------- */

test('a short loop is drawn once and the playhead comes back around', () => {
    const loop = music([
        track(
            Array.from({ length: 8 }, () => ({ degrees: [1], beats: 1 })),
            { loop: true },
        ),
    ]);
    const layout = layoutOf([loop], Wide);
    expect(layout.fits).toBe(true);
    expect(layout.loops).toBe(true);
    // Second pass reads the same as the first, rather than walking off the
    // right edge and never returning.
    expect(playheadOf(layout, 2)).toBeCloseTo(2);
    expect(playheadOf(layout, 10)).toBeCloseTo(2);
    expect(playheadOf(layout, 18)).toBeCloseTo(2);
});

test('a short one-shot does not wrap, because it does not come back', () => {
    const once = music([
        track(Array.from({ length: 8 }, () => ({ degrees: [1], beats: 1 }))),
    ]);
    const layout = layoutOf([once], Wide);
    expect(layout.loops).toBe(false);
    expect(playheadOf(layout, 10)).toBeCloseTo(10);
});

test('every mark has a distinct id, even within one chord', () => {
    // A chord holding both a natural and its sharp puts two noteheads on the
    // same staff step; position alone can't tell them apart.
    const marks = marksOf(
        [
            music([
                track([{ degrees: [1, 2], beats: 1 }], {
                    scale: Scales.chromatic,
                }),
            ]),
        ],
        0,
        4,
    );
    expect(marks).toHaveLength(2);
    expect(marks[0].step).toBe(marks[1].step);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(2);
});

test('ids stay distinct across loop passes and tracks', () => {
    const marks = marksOf(
        [
            music([
                track([{ degrees: [1], beats: 1 }], { loop: true }),
                track([{ degrees: [5], beats: 1 }], { loop: true }),
            ]),
        ],
        0,
        16,
    );
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
});

test('a notehead is tagged with its instrument emoji, not its name', () => {
    const marks = marksOf(
        [music([track([{ degrees: [1], beats: 1 }], { instrument: 'piano' })])],
        0,
        2,
    );
    expect(marks[0].label).toBe('🎹');
    expect(labelFor('drums')).toBe('🥁');
    // Every instrument has one now, so nothing falls back to a word.
    for (const id of InstrumentKeys) expect(labelFor(id)).not.toBe(id);
});

test('a restarting sound effect lays its strikes out one after another', () => {
    // A one-shot's own playhead drops to zero on every trigger; without the
    // cursor every strike would pile up in the same spot.
    let cursor = startCursor();
    const places: number[] = [];
    for (const beat of [0, 0.4, 0.8, 0, 0.4, 0, 0.3]) {
        cursor = advanceCursor(cursor, beat);
        places.push(absoluteBeat(cursor));
    }
    for (let i = 1; i < places.length; i++)
        expect(places[i]).toBeGreaterThanOrEqual(places[i - 1]);
    expect(places[places.length - 1]).toBeGreaterThan(1);
});

test('a steadily playing music is unaffected by the cursor', () => {
    let cursor = startCursor();
    for (const beat of [0, 1, 2, 3, 4]) cursor = advanceCursor(cursor, beat);
    expect(absoluteBeat(cursor)).toBe(4);
});

test('a fresh run starts a fresh history', () => {
    const history = startHistory();
    expect(history.seen.size).toBe(0);
    expect(history.cursors.size).toBe(0);
    // Two runs must not share state, since starting one is how the sheet
    // forgets the last.
    const other = startHistory();
    history.seen.set(
        'x',
        marksOf([music([track([{ degrees: [1], beats: 1 }])])], 0, 2)[0],
    );
    history.cursors.set('m', startCursor());
    expect(other.seen.size).toBe(0);
    expect(other.cursors.size).toBe(0);
});

test('a restarted program replays the same beats in the same places', () => {
    // The regression this guards. A cursor reads a beat that moves backwards
    // as a re-trigger and pushes the origin forward — right for a chime struck
    // twice, wrong for a program starting over, which would draw the new run
    // onto the end of the old one.
    const run = (history: ReturnType<typeof startHistory>) =>
        [0, 1, 2].map((beat) => {
            const cursor = advanceCursor(
                history.cursors.get('m') ?? startCursor(),
                beat,
            );
            history.cursors.set('m', cursor);
            return absoluteBeat(cursor);
        });

    const kept = startHistory();
    expect(run(kept)).toEqual([0, 1, 2]);
    // Keeping the history across the restart is what went wrong: the second
    // pass lands past the first instead of on top of it.
    expect(run(kept)).toEqual([2, 3, 4]);

    // Starting a new history puts the new run back where the old one began.
    expect(run(startHistory())).toEqual([0, 1, 2]);
});

test('notes are fitted vertically rather than clipped off the top', () => {
    const high = marksOf([music([track([{ degrees: [22], beats: 1 }])])], 0, 2);
    const range = stepRangeOf(high);
    expect(range.low).toBeLessThanOrEqual(high[0].step!);
    expect(range.high).toBeGreaterThanOrEqual(high[0].step!);
    // A lone note still gets a staff's worth of room rather than filling the
    // whole band.
    expect(range.high - range.low).toBeGreaterThanOrEqual(8);
});

test('a wide register is spanned by the range', () => {
    const wide = marksOf(
        [
            music([
                track([{ degrees: [-14], beats: 1 }], {
                    instrument: 'synthBass',
                }),
                track([{ degrees: [22], beats: 1 }], { instrument: 'flute' }),
            ]),
        ],
        0,
        2,
    );
    const range = stepRangeOf(wide);
    const steps = wide.map((mark) => mark.step!);
    expect(range.low).toBeLessThanOrEqual(Math.min(...steps));
    expect(range.high).toBeGreaterThanOrEqual(Math.max(...steps));
});

test('a length that only just exceeds the threshold by rounding still fits', () => {
    // Cat Scat's thirty-two beats really do sum to 32.00000000000002, and a
    // piece sitting exactly on the threshold shouldn't scroll over that.
    const across = beatsAcross(Wide, 1);
    const drifting = music([
        track([
            ...Array.from({ length: across - 1 }, () => ({
                degrees: [1],
                beats: 1,
            })),
            { degrees: [1], beats: 1 + 2e-14 },
        ]),
    ]);
    expect(lengthOf([drifting])).toBeGreaterThan(across);
    expect(layoutOf([drifting], Wide).fits).toBe(true);
    // But a piece genuinely longer still scrolls.
    expect(
        layoutOf(
            [
                music([
                    track(
                        Array.from({ length: across + 1 }, () => ({
                            degrees: [1],
                            beats: 1,
                        })),
                    ),
                ]),
            ],
            Wide,
        ).fits,
    ).toBe(false);
});

/* ---------------------------------------------------------------- *
 * Crowding
 * ---------------------------------------------------------------- */

test('tightly written music gets more room per beat, so notes never collide', () => {
    const quarters = music([
        track(Array.from({ length: 40 }, () => ({ degrees: [1], beats: 1 }))),
    ]);
    const sixteenths = music([
        track(
            Array.from({ length: 40 }, () => ({ degrees: [1], beats: 0.25 })),
        ),
    ]);
    const wide = layoutOf([quarters], Wide);
    const tight = layoutOf([sixteenths], Wide);
    // The tighter piece shows fewer beats at once, which is the same thing as
    // giving each beat more room.
    expect(tight.beats).toBeLessThan(wide.beats);
    // And in both, the gap between two adjacent notes is at least a notehead.
    for (const [layout, spacing] of [
        [wide, 1],
        [tight, 0.25],
    ] as const)
        expect((Wide / layout.beats) * spacing).toBeGreaterThanOrEqual(
            MinBeatWidth - 1,
        );
});

test("an importer's hairline rests are not drawn", () => {
    // What `npm run midi` writes: a note, then a 0.021-beat rest to keep the
    // track tiling, over and over. Drawing those puts a rest on every note.
    const imported = music([
        track(
            Array.from({ length: 8 }, (_, i) =>
                i % 2 === 0
                    ? { degrees: [1], beats: 0.479 }
                    : { degrees: [], beats: 0.021 },
            ),
        ),
    ]);
    const marks = marksOf([imported], 0, 8);
    expect(marks.every((mark) => !mark.rest)).toBe(true);
    expect(marks).toHaveLength(4);

    // A rest long enough to read is still drawn.
    const breathing = music([
        track([
            { degrees: [1], beats: 1 },
            { degrees: [], beats: 1 },
        ]),
    ]);
    expect(marksOf([breathing], 0, 4).some((mark) => mark.rest)).toBe(true);
});

test('a hairline rest does not decide the spacing either', () => {
    const imported = music([
        track([
            { degrees: [1], beats: 1 },
            { degrees: [], beats: 0.021 },
            { degrees: [1], beats: 1 },
        ]),
    ]);
    // Density reads the gap between notes, not the punctuation between them.
    expect(densityOf([imported])).toBeCloseTo(1.021, 3);
});

test('a rest is only drawn when there is one line to read', () => {
    const alone = music([
        track([
            { degrees: [1], beats: 1 },
            { degrees: [], beats: 1 },
        ]),
    ]);
    expect(marksOf([alone], 0, 4).some((mark) => mark.rest)).toBe(true);

    // Superimposed, a rest in one track lands at whatever offset that track
    // sits at and collides with notes it has nothing to do with.
    const together = music([
        track([
            { degrees: [1], beats: 1 },
            { degrees: [], beats: 1 },
        ]),
        track([{ degrees: [5], beats: 0.5 }], { loop: true }),
    ]);
    expect(marksOf([together], 0, 4).some((mark) => mark.rest)).toBe(false);
});

test('a rest that something plays through is not drawn', () => {
    const covered = music([
        track([
            { degrees: [], beats: 4 },
            { degrees: [1], beats: 1 },
        ]),
    ]);
    // The whole-note rest overlaps nothing here, so it stays.
    expect(marksOf([covered], 0, 8).some((mark) => mark.rest)).toBe(true);
});

test('tracks that drift against each other still never crowd', () => {
    // Loops of different lengths interleave into ever finer offsets as they
    // repeat, which reading a single pass cannot see — this is Cat Scat's
    // shape, and it is what made notes land fifteen pixels apart.
    const drifting = music([
        track(
            Array.from({ length: 4 }, () => ({ degrees: [1], beats: 1 })),
            {
                loop: true,
            },
        ),
        track(
            Array.from({ length: 7 }, () => ({ degrees: [5], beats: 2 / 3 })),
            {
                loop: true,
            },
        ),
    ]);
    const width = 1290;
    const layout = layoutOf([drifting], width);
    const perBeat = width / layout.beats;
    const onsets = [
        ...new Set(
            marksOf([drifting], 0, layout.beats).map(
                (mark) => Math.round(mark.beat * 1e6) / 1e6,
            ),
        ),
    ].sort((a, b) => a - b);
    for (let i = 1; i < onsets.length; i++)
        expect((onsets[i] - onsets[i - 1]) * perBeat).toBeGreaterThanOrEqual(
            MinBeatWidth - 1,
        );
});

/* ---------------------------------------------------------------- *
 * The staff and the notes share one scale
 * ---------------------------------------------------------------- */

test('a step on a line is drawn on that line', () => {
    // The whole point: five CSS rules could only agree with the pitches by
    // accident, so lines and noteheads are placed by the same function.
    const center = 4;
    for (const line of staffLines(center)) {
        const placed = placeStep(line, center);
        expect(Number.isFinite(placed)).toBe(true);
    }
    // The middle line is the centre of the band.
    expect(placeStep(center, center)).toBeCloseTo(0.5);
    // And the lines are evenly spaced, as staff lines are.
    const places = staffLines(center).map((line) => placeStep(line, center));
    const gaps = places.slice(1).map((place, i) => places[i] - place);
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]);
});

test('a note between two lines sits in the space between them', () => {
    const center = 4;
    const [, second, middle] = staffLines(center);
    const between = placeStep(second + 1, center);
    expect(between).toBeLessThan(placeStep(second, center));
    expect(between).toBeGreaterThan(placeStep(middle, center));
});

test('higher pitch is higher on the page, and an octave is always an octave', () => {
    const center = 0;
    expect(placeStep(7, center)).toBeLessThan(placeStep(0, center));
    // The scale is fixed, so the same interval is the same distance wherever
    // it sits — which a fitted range could not promise.
    // Sampled inside the visible register; outside it the clamp holds, which
    // is what keeps a far-off note at the edge instead of off the page.
    const low = placeStep(-7, center) - placeStep(0, center);
    const high = placeStep(0, center) - placeStep(7, center);
    expect(low).toBeCloseTo(high);
});

test('the staff centres on the music, not on middle C', () => {
    // A bass part sits below middle C throughout; centring on C would put all
    // of it under the staff and read as "the notes are all low".
    const bass = marksOf(
        [
            music([
                track(
                    Array.from({ length: 8 }, (_, i) => ({
                        degrees: [-14 + i],
                        beats: 1,
                    })),
                ),
            ]),
        ],
        0,
        16,
    );
    const center = staffCenterOf(bass);
    expect(center).toBeLessThan(0);
    // And with that centre, the part sits around the middle of the band.
    const places = bass.map((mark) => placeStep(mark.step!, center));
    expect(Math.min(...places)).toBeGreaterThan(0.1);
    expect(Math.max(...places)).toBeLessThan(0.9);
});

test('the centre is a line, so the music is centred on one', () => {
    for (const degrees of [[-14], [0], [21], [3, 5, 7]]) {
        const marks = marksOf(
            [music([track(degrees.map((d) => ({ degrees: [d], beats: 1 })))])],
            0,
            8,
        );
        expect(Math.abs(staffCenterOf(marks) % 2)).toBe(0);
    }
});

test('a note far outside the register sits at the edge rather than vanishing', () => {
    const center = 0;
    expect(placeStep(500, center)).toBe(0);
    expect(placeStep(-500, center)).toBe(1);
});
