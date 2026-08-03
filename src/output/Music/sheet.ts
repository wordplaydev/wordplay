/**
 * The sheet-music rendering, as pure math so its geometry is testable.
 *
 * This is the precise end of the range of renderings. The orchestra says which
 * instruments are striking, the light show says that something is, the mood
 * cloud says what kind of piece it is — and none of them says what the *notes*
 * are, though the notes are right there in the value.
 *
 * **It echoes notation; it does not typeset it.** There are no beams, bar
 * lines, time signatures, key signatures, or staves plural. What it does keep
 * is the two things that make notation legible at a glance: pitch as height on
 * a staff, and duration as the shape of the notehead. Every glyph it needs is
 * in the font chain — the Musical Symbols block, checked against
 * `isCodepointRenderable`, not just the ♩♪ of Miscellaneous Symbols.
 *
 * Time runs left to right in beats, so a note's horizontal position is its
 * onset and everything about the layout is a multiplication.
 */

import { degreeToSemitones } from '@output/Music/degrees';
import { PlainDurations } from '@output/Music/durations';
import { instrumentSpec } from '@output/Music/instruments';
import {
    noteOnset,
    trackLength,
    type MusicData,
    type TrackData,
} from '@output/Music/musicData';

/* ------------------------------------------------------------------ *
 * Glyphs
 * ------------------------------------------------------------------ */

/**
 * Notehead by duration in beats, longest first. A note is drawn as the
 * longest value that isn't longer than it is, so a dotted or irregular
 * duration reads as the note it is closest to from below rather than
 * rounding up into a value the music never plays.
 *
 * The glyphs come from the duration table rather than being spelled here, so
 * the notehead a creator writes as a unit is the same string the sheet draws.
 */
export const Noteheads: readonly { beats: number; glyph: string }[] =
    PlainDurations.map((duration) => ({
        beats: duration.beats,
        glyph: duration.unit,
    }));

/** Rests by duration, same rule. */
export const Rests: readonly { beats: number; glyph: string }[] = [
    { beats: 4, glyph: '\u{1D13B}' }, // 𝄻 whole rest
    { beats: 2, glyph: '\u{1D13C}' }, // 𝄼 half rest
    { beats: 1, glyph: '\u{1D13D}' }, // 𝄽 quarter rest
    { beats: 0.5, glyph: '\u{1D13E}' }, // 𝄾 eighth rest
    { beats: 0.25, glyph: '\u{1D13F}' }, // 𝄿 sixteenth rest
];

export const TrebleClef = '\u{1D11E}'; // 𝄞
export const Sharp = '♯'; // ♯

/** The glyph for a duration. Never empty for a positive duration: anything
 * shorter than a sixteenth is still drawn as one, since a note that plays
 * ought to be visible. */
export function glyphFor(beats: number, rest = false): string {
    const table = rest ? Rests : Noteheads;
    for (const entry of table) if (beats >= entry.beats) return entry.glyph;
    return table[table.length - 1].glyph;
}

/* ------------------------------------------------------------------ *
 * Pitch on a staff
 * ------------------------------------------------------------------ */

/**
 * Semitones to a diatonic step: which line or space a pitch sits on, counting
 * from middle C at 0.
 *
 * This is what makes the rendering read as notation rather than as a pitch
 * plot. On a staff there are seven positions to an octave, not twelve, and a
 * sharp shares a line with its natural — so C and C♯ both land on step 0 and
 * the accidental is what tells them apart.
 */
const WhiteKeySteps = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

export function staffStep(semitones: number): number {
    const octave = Math.floor(semitones / 12);
    const pitchClass = ((semitones % 12) + 12) % 12;
    return WhiteKeySteps[pitchClass] + octave * 7;
}

/** The accidental a pitch needs, or undefined when it sits on a natural. */
export function accidentalFor(semitones: number): string | undefined {
    const pitchClass = ((semitones % 12) + 12) % 12;
    const previous = pitchClass === 0 ? 11 : pitchClass - 1;
    return WhiteKeySteps[pitchClass] === WhiteKeySteps[previous]
        ? Sharp
        : undefined;
}

/* ------------------------------------------------------------------ *
 * The score
 * ------------------------------------------------------------------ */

/** One thing to draw: a notehead or a rest, at a beat and a staff step. */
export type Mark = {
    /** Unique within a build. Two notes of one chord can land on the same
     * staff step — a C and a C♯ share a line — so nothing derived from
     * position alone is unique enough to key a list by. */
    id: string;
    /** Absolute beat of its onset. */
    beat: number;
    /** How long it lasts, in beats. */
    beats: number;
    /** Diatonic step from middle C; undefined for a rest. */
    step: number | undefined;
    /** The glyph to draw. */
    glyph: string;
    /** An accidental to draw before it, when the pitch needs one. */
    accidental: string | undefined;
    /** The instrument's emoji, drawn in superscript beside the notehead —
     * a glyph beside a glyph, rather than a word in whatever language the
     * viewer happens to read. */
    label: string;
    /** The instrument id, for keying and tests. */
    instrument: string;
    /** Which music and track it came from, so a view can key on it. */
    music: string;
    track: number;
    rest: boolean;
};

/** Rests are drawn on the middle line, where notation puts them. */
export const RestStep = 3;

/** What a notehead is tagged with. An emoji reads the same in every language
 * and takes the space a superscript has; the written name is a fallback for
 * the few instruments Unicode has no picture for. */
export function labelFor(instrument: string): string {
    return instrumentSpec(instrument)?.emoji ?? instrument;
}

/**
 * Every mark sounding between two beats, across every music and track.
 *
 * Windowed rather than whole: a looping track repeats through the window and
 * a 375-beat piece costs the same to lay out as an eight-beat one, because
 * only what is visible is ever built.
 */
export function marksOf(
    musics: readonly MusicData[],
    fromBeat: number,
    toBeat: number,
): Mark[] {
    const marks: Mark[] = [];
    for (const music of musics)
        for (let index = 0; index < music.tracks.length; index++)
            collectTrack(
                marks,
                music,
                music.tracks[index],
                index,
                fromBeat,
                toBeat,
            );
    marks.sort((a, b) => a.beat - b.beat || a.track - b.track);
    // A rest only reads as a rest when there is one line to read. Superimpose
    // several tracks and a rest in one of them lands at whatever fine offset
    // its track happens to sit at, colliding with notes it has nothing to do
    // with — so a score of more than one track shows silence by having nothing
    // drawn, which is what silence looks like anyway.
    let tracks = 0;
    for (const music of musics) tracks += music.tracks.length;
    return tracks > 1
        ? marks.filter((mark) => !mark.rest)
        : withoutCoveredRests(marks);
}

/**
 * Drop any rest that something else is playing through.
 *
 * Every track is superimposed on one staff, so a rest only means anything when
 * the *whole piece* is silent. A rest drawn while other tracks sound says
 * nothing a reader can use and is most of what crowds a dense score — Cat
 * Scat draws three rests for every note it plays.
 */
function withoutCoveredRests(marks: readonly Mark[]): Mark[] {
    const sounding = marks
        .filter((mark) => !mark.rest)
        .map((mark) => [mark.beat, mark.beat + mark.beats] as const)
        .sort((a, b) => a[0] - b[0]);
    if (sounding.length === 0) return [...marks];

    const kept: Mark[] = [];
    let at = 0;
    for (const mark of marks) {
        if (!mark.rest) {
            kept.push(mark);
            continue;
        }
        const end = mark.beat + mark.beats;
        // Marks are in beat order, so the scan only ever moves forward.
        while (at < sounding.length && sounding[at][1] <= mark.beat) at++;
        let covered = false;
        for (let i = at; i < sounding.length && sounding[i][0] < end; i++)
            if (sounding[i][1] > mark.beat) {
                covered = true;
                break;
            }
        if (!covered) kept.push(mark);
    }
    return kept;
}

function collectTrack(
    marks: Mark[],
    music: MusicData,
    track: TrackData,
    index: number,
    fromBeat: number,
    toBeat: number,
) {
    const length = trackLength(track);
    if (track.notes.length === 0 || length <= 0) return;

    // A looping track repeats; a one-shot happens once. Starting the pass at
    // the first one that could reach the window is what bounds the work.
    const firstPass = track.loop ? Math.floor(fromBeat / length) : 0;
    const lastPass = track.loop ? Math.floor(toBeat / length) : 0;

    for (let pass = Math.max(0, firstPass); pass <= lastPass; pass++) {
        const offset = pass * length;
        for (let note = 0; note < track.notes.length; note++) {
            const entry = track.notes[note];
            const beat = offset + noteOnset(track, note);
            // A note is visible if any part of it falls in the window.
            if (beat + entry.beats < fromBeat || beat > toBeat) continue;
            const rest = entry.degrees.length === 0;
            // A hairline rest is data, not notation; drawing it would put a
            // glyph on top of every note in an imported piece.
            if (rest && entry.beats < MinRestBeats) continue;
            const id = `${music.name}\u0000${index}\u0000${pass}\u0000${note}`;
            if (rest) {
                marks.push({
                    id,
                    beat,
                    beats: entry.beats,
                    step: undefined,
                    glyph: glyphFor(entry.beats, true),
                    accidental: undefined,
                    label: labelFor(track.instrument),
                    instrument: track.instrument,
                    music: music.name,
                    track: index,
                    rest: true,
                });
                continue;
            }
            // A chord is several noteheads at one beat, which is exactly how
            // notation draws it.
            for (let voice = 0; voice < entry.degrees.length; voice++) {
                const semitones = degreeToSemitones(
                    entry.degrees[voice],
                    track.scale,
                    track.key,
                );
                marks.push({
                    id: `${id}\u0000${voice}`,
                    beat,
                    beats: entry.beats,
                    step: staffStep(semitones),
                    glyph: glyphFor(entry.beats),
                    accidental: accidentalFor(semitones),
                    label: labelFor(track.instrument),
                    instrument: track.instrument,
                    music: music.name,
                    track: index,
                    rest: false,
                });
            }
        }
    }
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

/**
 * The narrowest a beat may be drawn, in pixels.
 *
 * This is what decides fit-or-scroll, rather than a beat count: a notehead
 * plus its instrument superscript needs about this much room, and squeezing a
 * piece into fewer pixels a beat makes the notes overlap each other instead of
 * being read. Happy Birthday's twenty-six beats fit a wide stage and scroll a
 * narrow one, which is the honest reading of "fill the notes or the width".
 */
export const MinBeatWidth = 46;

/**
 * A rest shorter than this isn't drawn.
 *
 * The MIDI importer writes a hairline rest between every pair of notes to keep
 * a track tiling — Lyrics has a 0.021-beat rest between each of its notes —
 * and drawing those puts a rest glyph on top of every notehead in the piece.
 * They are punctuation in the data, not something a reader wants to see.
 */
export const MinRestBeats = 0.125;

/**
 * The tightest spacing the score actually uses, in beats.
 *
 * Spacing has to be decided by how close two notes get, not by the beat: a
 * piece whose notes fall every half beat needs twice the room per beat that a
 * piece of quarter notes does, or its noteheads sit on top of each other.
 * Rests don't count — they are skipped when short — and the floor keeps one
 * freakishly short note from stretching the whole layout.
 */
export const MinSpacing = 1 / 8;

export const ProbeBeats = 32;

export function densityOf(musics: readonly MusicData[]): number {
    // Measured from the marks themselves rather than from note durations, so
    // it measures what is actually drawn. Two reasons durations don't answer
    // it: tracks can be offset from each other by less than either one's
    // shortest note, and tracks of *different loop lengths* — Cat Scat's —
    // drift into ever finer offsets as they repeat, which reading a single
    // pass can never see.
    const onsets = [
        ...new Set(
            marksOf(musics, 0, ProbeBeats)
                // Rounded, because simultaneous notes in different tracks reach
                // the same instant by different sums and differ by about
                // 1e-14; those are one onset, not two.
                .map((mark) => Math.round(mark.beat * 1e6) / 1e6),
        ),
    ].sort((a, b) => a - b);

    let tightest = Infinity;
    for (let i = 1; i < onsets.length; i++)
        tightest = Math.min(tightest, onsets[i] - onsets[i - 1]);
    return Number.isFinite(tightest) ? Math.max(MinSpacing, tightest) : 1;
}

/** Beats a screen of this width can show without the notes colliding, given
 * how tightly the music is written. */
export function beatsAcross(width: number, spacing = 1): number {
    const perBeat = MinBeatWidth / Math.max(MinSpacing, spacing);
    return Math.max(2, Math.floor(width / perBeat));
}

export type Layout = {
    /** Whether the whole piece is shown at once. */
    fits: boolean;
    /** Beats spanned by the visible width. */
    beats: number;
    /** Total beats of the longest music, one pass. */
    length: number;
    /** Whether what is playing comes back around. */
    loops: boolean;
};

/** The longest single pass of any music on stage. */
export function lengthOf(musics: readonly MusicData[]): number {
    let longest = 0;
    for (const music of musics)
        for (const track of music.tracks)
            longest = Math.max(longest, trackLength(track));
    return longest;
}

/** Whether any track on stage comes back around. */
export function loopsIn(musics: readonly MusicData[]): boolean {
    for (const music of musics)
        for (const track of music.tracks)
            if (track.loop && trackLength(track) > 0) return true;
    return false;
}

/**
 * Fit or scroll. A piece short enough to read at once is laid out whole and
 * doesn't move; anything longer scrolls at a fixed beats-per-screen, so a
 * note's width always means the same duration.
 */
export function layoutOf(musics: readonly MusicData[], width: number): Layout {
    const length = lengthOf(musics);
    const across = beatsAcross(width, densityOf(musics));
    // A tolerance, because a length is a sum of fractional beats: Cat Scat's
    // thirty-two come to 32.00000000000002, and a piece sitting exactly on the
    // width shouldn't scroll over a rounding error.
    const fits = length > 0 && length <= across + 1e-6;
    return {
        fits,
        beats: fits ? length : across,
        length,
        loops: loopsIn(musics),
    };
}

/**
 * Where the sheet stops.
 *
 * A transport's beat grows forever, so a piece that has played its last note
 * keeps scrolling into empty staff. A score that ends should sit at its
 * ending instead. A loop never ends, and a music with no written score at all
 * — a sound effect built from momentary notes — has no ending to stop at.
 */
export function headOf(
    layout: Layout,
    beat: number,
    end = layout.length,
): number {
    // `end` is how far there is anything to see, which is not the same as the
    // written score's length: a sound effect re-triggered five times has a
    // written length of one note but five notes' worth of history behind it,
    // and clamping to the score would freeze the sheet after the first.
    const stop = Math.max(layout.length, end);
    return layout.loops || stop <= 0 ? beat : Math.min(beat, stop);
}

/**
 * Where the playhead sits on the drawn staff.
 *
 * A short loop is drawn once and the playhead sweeps it again on each pass —
 * which is the whole point of showing a loop whole. Without the wrap the
 * playhead walks off the right edge on the second time round and never comes
 * back, so a looping piece like Happy Birthday looked frozen after one pass.
 */
export function playheadOf(layout: Layout, beat: number): number {
    return layout.fits && layout.loops && layout.length > 0
        ? ((beat % layout.length) + layout.length) % layout.length
        : beat;
}

/**
 * How many staff steps the band shows, top to bottom.
 *
 * Fixed rather than fitted, because a staff has a fixed pitch scale: two notes
 * an octave apart must always look an octave apart, and the five lines have to
 * mean the same thing in every piece. Twenty-four steps is about three and a
 * half octaves — enough for most music to sit inside, and tight enough that a
 * semitone is still visible.
 */
export const StepsVisible = 24;

/** Steps between staff lines. Lines fall on every other step, which is what
 * makes a note sit either on a line or in the space between two. */
export const LineSpacing = 2;

/**
 * The step the middle line represents: the median of what is played, rounded
 * to an even step so the centre really is a line.
 *
 * Centred on the music rather than on middle C, because a bass part and a
 * piccolo part cannot both sit on a fixed staff — and a piece that sat
 * entirely below the staff, as a 41-track rock arrangement does, would read
 * as "all the notes are low" rather than as music.
 */
export function staffCenterOf(marks: readonly Mark[]): number {
    const steps = marks
        .filter((mark) => mark.step !== undefined)
        .map((mark) => mark.step as number)
        .sort((a, b) => a - b);
    if (steps.length === 0) return 4;
    const median = steps[Math.floor(steps.length / 2)];
    return Math.round(median / LineSpacing) * LineSpacing;
}

/** The steps the five lines represent, low to high. */
export function staffLines(center: number): number[] {
    return [-2, -1, 0, 1, 2].map((line) => center + line * LineSpacing);
}

/**
 * Where a step sits in the band, 0 at the top and 1 at the bottom, clamped so
 * a note far outside the visible register sits at the edge rather than
 * disappearing — which is what a pile of ledger lines amounts to anyway.
 */
export function placeStep(step: number, center: number): number {
    const place = 0.5 - (step - center) / StepsVisible;
    return Math.min(1, Math.max(0, place));
}

/** The lowest and highest steps among some marks, for fitting them
 * vertically. Music sits where its register is rather than clipping off the
 * top of the staff, which a bass line and a piccolo can't both avoid at a
 * fixed scale. */
export function stepRangeOf(marks: readonly Mark[]): {
    low: number;
    high: number;
} {
    let low = 0;
    let high = 0;
    let seen = false;
    for (const mark of marks) {
        if (mark.step === undefined) continue;
        low = seen ? Math.min(low, mark.step) : mark.step;
        high = seen ? Math.max(high, mark.step) : mark.step;
        seen = true;
    }
    // Always at least the height of a staff, so a single note isn't blown up
    // to fill the whole band.
    if (high - low < 8) {
        const middle = (high + low) / 2;
        low = middle - 4;
        high = middle + 4;
    }
    return { low, high };
}

/**
 * Where the visible window starts, in beats. A fitted piece never scrolls; a
 * scrolling one keeps the playhead a third of the way in, so there is more
 * ahead of it to read than behind.
 */
export const PlayheadFraction = 1 / 3;

export function windowStart(layout: Layout, beat: number): number {
    return layout.fits ? 0 : beat - layout.beats * PlayheadFraction;
}

/**
 * Keep an absolute, forward-only beat across restarts.
 *
 * A one-shot sound effect restarts on every trigger, so its own playhead
 * drops back to zero each time and every strike would pile up at the same
 * spot. Carrying the previous position forward gives each one its own place
 * on the sheet, so a chime struck five times reads as five notes.
 */
export type Cursor = { origin: number; last: number };

export function startCursor(): Cursor {
    return { origin: 0, last: 0 };
}

export function advanceCursor(cursor: Cursor, beat: number): Cursor {
    return beat < cursor.last
        ? { origin: cursor.origin + cursor.last, last: beat }
        : { ...cursor, last: beat };
}

export function absoluteBeat(cursor: Cursor): number {
    return cursor.origin + cursor.last;
}
