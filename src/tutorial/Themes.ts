/**
 * The short looping music a tutorial act or scene title card plays: one theme
 * per act, one per concept a scene teaches. A theme is a claim about a
 * character — Stage is the lowest and loudest thing here because Stage shouts
 * in all caps; Block opens on a rest because Block opens every line with "…";
 * None has no theme at all, because None only ever says "…".
 *
 * Themes are authored as data and rendered to Wordplay source, rather than
 * written as source, so `Themes.test.ts` can hold the whole vocabulary to the
 * authoring rules below rather than trusting 45 hand-typed programs.
 *
 * ## Authoring rules, all enforced by the test
 *
 * Title cards are read-only, so `ProjectView` passes `warn={!editable}` and a
 * theme that tripped {@link MusicSafetyAnalysis} would put a start gate on a
 * title card — a lesson you have to dismiss a warning to reach. Three of the
 * rules exist only to keep every theme clear of it:
 *
 * - **Tempo ≤ 132 and no entry shorter than one beat**, so the fastest a theme
 *   can pulse is 2.2 notes a second, under the 3 Hz `MinFlashHz` band.
 * - **Master volume 25–35%.** The floor is audibility — below about a quarter
 *   these vanish against a room. The ceiling keeps even four tracks summing
 *   well under the level at which quiet parts add up to a loud piece.
 * - **Degrees 1–10 and `key` within ±12 semitones**, so nothing wanders out of
 *   a comfortable register.
 *
 * And two that are about how a loop sounds rather than whether it's safe:
 *
 * - **1–4 tracks, and every layer loops in 4–16 beats.** A title card is a few
 *   seconds long. The bound is on the loop's length rather than its entry
 *   count, because a sustained pad covering eight beats is two entries and a
 *   melody covering the same eight is eight of them.
 * - **Every motif ends on a rest**, because there is no cross-fade: the theme
 *   is cut the moment you advance past the title card, and a quiet loop cut at
 *   a rest is not a jarring cut.
 * - **No two themes sound alike.** Enforced on the sounding content, not the
 *   name: three themes were once the same struck bell, which tells a learner
 *   two unrelated cards are the same thing.
 *
 * Themes never sing: no `voice`, no lyrics. The one voice in the tutorial is
 * the dialogue.
 */

import type { InstrumentKey } from '@output/Music/instruments';
import type { ScaleKey } from '@output/Music/scales';
import { ThemeNames, type ThemeName } from './ThemeNames';

/** A degree, a chord, or `null` for a rest. */
export type Motif = readonly (number | readonly number[] | null)[];

export type ThemeLayer = {
    instrument: InstrumentKey;
    motif: Motif;
    /** Beats per entry; at least 1. Defaults to 1. */
    beat?: number;
    /** Percent, 0–100. Defaults to 100. */
    volume?: number;
    /** Semitones, within ±12. Defaults to 0. */
    key?: number;
    /** −1 left … 1 right. Defaults to centered. */
    pan?: number;
};

export type ThemeSpec = {
    /** Beats per minute, at most 132. */
    tempo: number;
    /** Percent, at most 30. */
    volume: number;
    scale: ScaleKey;
    /** 1–4 layers. */
    layers: readonly ThemeLayer[];
};

function entry(value: number | readonly number[] | null): string {
    if (value === null) return 'ø';
    if (typeof value === 'number') return `${value}`;
    return `{${value.join(' ')}}`;
}

function layerSource(layer: ThemeLayer): string {
    const inputs = [
        `[${layer.motif.map(entry).join(' ')}]`,
        `instrument: Instrument.${layer.instrument}`,
        ...(layer.beat !== undefined ? [`beat: ${layer.beat}beats`] : []),
        ...(layer.volume !== undefined ? [`volume: ${layer.volume}%`] : []),
        ...(layer.key !== undefined ? [`key: ${layer.key}semitones`] : []),
        ...(layer.pan !== undefined ? [`pan: ${layer.pan}`] : []),
    ];
    return `Track(${inputs.join(' ')})`;
}

/**
 * A theme as Wordplay source: one `Music(...)` expression, nothing else. The
 * two callers place it differently — appended as a final expression for a
 * program that returns something visible, or spliced into the content list of
 * a program that builds its own `Stage` — so this returns the expression alone
 * and neither a list nor a stage.
 */
export function themeSource(spec: ThemeSpec): string {
    // Music's first input takes one track or a list of them; passing a lone
    // track directly keeps a one-layer theme to a single readable line.
    const tracks =
        spec.layers.length === 1
            ? layerSource(spec.layers[0])
            : `[${spec.layers.map(layerSource).join(' ')}]`;
    return `Music(${tracks} tempo: ${spec.tempo}beats/min volume: ${spec.volume}% scale: Music.${spec.scale})`;
}

export const Themes: Record<ThemeName, ThemeSpec> = {
    // ── Acts ──────────────────────────────────────────────────────────────
    // An act's own title card. Deliberately little tunes rather than a struck
    // note: an act card is the widest gesture in the tutorial, and the eight of
    // them are the only themes a learner hears in sequence with each other.

    /** A curtain going up in the dark: a flute phrase over a slow bell. */
    Act1: {
        tempo: 66,
        volume: 28,
        scale: 'minorPentatonic',
        layers: [
            { instrument: 'flute', motif: [1, 3, 5, 8, 7, 5, null, null] },
            { instrument: 'bell', motif: [1, null, 5, null], beat: 2, volume: 55 },
        ],
    },
    /** Small curious steps, nothing grand: the act of little things. */
    Act2: {
        tempo: 96,
        volume: 29,
        scale: 'pentatonic',
        layers: [
            { instrument: 'piano', motif: [1, 2, 3, 5, 3, 2, null, null] },
            { instrument: 'bell', motif: [null, null, 8, null], beat: 2, volume: 50 },
        ],
    },
    /** An ensemble, literally: a melody, a chord, and a pulse. */
    Act3: {
        tempo: 104,
        volume: 32,
        scale: 'major',
        layers: [
            { instrument: 'flute', motif: [5, 6, 8, 6, 5, 3, 1, null] },
            { instrument: 'synthPad', motif: [[1, 3, 5], null, [4, 6, 8], null], beat: 2, volume: 45 },
            { instrument: 'drums', motif: [1, null, 2, null], beat: 2, volume: 50 },
        ],
    },
    /** A party you can hear through a wall. */
    Act4: {
        tempo: 124,
        volume: 33,
        scale: 'mixolydian',
        layers: [
            { instrument: 'acousticGuitar', motif: [1, 1, 3, 5, 6, 5, 3, null] },
            { instrument: 'drums', motif: [1, 2, 1, 2, 1, 2, 1, null], volume: 50 },
        ],
    },
    /** Machinery, for the act where the world starts sending input. */
    Act5: {
        tempo: 108,
        volume: 30,
        scale: 'dorian',
        layers: [
            { instrument: 'synth', motif: [1, 5, 4, 3, 5, 1, null, null] },
            { instrument: 'synthBass', motif: [1, null, 4, null], beat: 2, key: -12, volume: 60 },
        ],
    },
    /** Showtime: a fanfare that actually climbs. */
    Act6: {
        tempo: 112,
        volume: 34,
        scale: 'major',
        layers: [
            { instrument: 'trumpet', motif: [1, 3, 5, 8, 10, 8, null, null] },
            { instrument: 'synthBass', motif: [1, null, 5, null], beat: 2, key: -12, volume: 60 },
            { instrument: 'drums', motif: [1, null, 2, null], beat: 2, volume: 50 },
        ],
    },
    /** Memory. The saxophone is here and nowhere else in the tutorial, which
     * is the point: you know this act by its colour before its tune. */
    Act7: {
        tempo: 76,
        volume: 29,
        scale: 'minor',
        layers: [
            { instrument: 'saxophone', motif: [5, 3, 1, 2, 3, null, null, null] },
            { instrument: 'piano', motif: [1, null, null, null], beat: 4, key: -12, volume: 55 },
        ],
    },
    /** Grief, resolving. The act opens on a frightened face. */
    Act8: {
        tempo: 66,
        volume: 32,
        scale: 'harmonicMinor',
        layers: [
            { instrument: 'violin', motif: [8, 7, 5, 6, 5, 3, 1, null] },
            { instrument: 'synthPad', motif: [[1, 3, 5], null], beat: 4, volume: 45 },
        ],
    },
    /** Brisk and neutral: the quick tour gets out of its own way. */
    Quick: {
        tempo: 120,
        volume: 27,
        scale: 'mixolydian',
        layers: [
            { instrument: 'acousticGuitar', motif: [1, 5, 8, 5, 3, null] },
            { instrument: 'synthBass', motif: [1, null, 5, null], beat: 2, key: -12, volume: 55 },
        ],
    },

    // ── Act openings ─────────────────────────────────────────────────────
    // The one scene in each act that teaches no concept. These used to fall
    // back to their act's theme, which meant the act card and the very next
    // card played the same tune back to back. Each is about what its scene is
    // about, and each is quieter and smaller than the act it follows.

    /** Before anything exists. The emptiest thing that is still a sound. */
    Silence: {
        tempo: 50,
        volume: 25,
        scale: 'wholeTone',
        layers: [{ instrument: 'synthPad', motif: [1, null, null, null], beat: 4 }],
    },
    /** Small and exact: the scene where things start having values. */
    Values: {
        tempo: 88,
        volume: 27,
        scale: 'pentatonic',
        layers: [{ instrument: 'bell', motif: [1, null, 3, null, 5, null, null, null] }],
    },
    /** Repetition you can hear, for the scene about repetition. */
    Patterns: {
        tempo: 116,
        volume: 28,
        scale: 'chromatic',
        layers: [{ instrument: 'synth', motif: [1, 2, 1, 2, 1, 2, null, null] }],
    },
    /** Two voices, one answering the other: a community forming. */
    Collections: {
        tempo: 100,
        volume: 29,
        scale: 'major',
        layers: [
            { instrument: 'acousticGuitar', motif: [1, 3, 5, null] },
            { instrument: 'flute', motif: [null, 8, 5, null], volume: 55 },
        ],
    },
    /** A sidestep. The only theme in blues, because it is the only detour. */
    Detour: {
        tempo: 108,
        volume: 29,
        scale: 'blues',
        layers: [{ instrument: 'electricGuitar', motif: [1, null, 4, 3, null, null] }],
    },
    /** The world arriving: a pulse, and something answering it. */
    Input: {
        tempo: 100,
        volume: 28,
        scale: 'dorian',
        layers: [
            { instrument: 'drums', motif: [1, null, 1, null], volume: 55 },
            { instrument: 'synth', motif: [1, null, 5, null] },
        ],
    },
    /** Something appearing, and being noticed. */
    Output: {
        tempo: 108,
        volume: 30,
        scale: 'major',
        layers: [
            { instrument: 'trumpet', motif: [1, 5, 8, null] },
            { instrument: 'bell', motif: [null, 8, null, null], volume: 50 },
        ],
    },
    /** Distant, and alone: one piano, walking down. */
    Memories: {
        tempo: 70,
        volume: 26,
        scale: 'minor',
        layers: [{ instrument: 'piano', motif: [5, 3, 2, 1, null, null, null, null] }],
    },
    /** The breakup. A figure that leans on a note and never resolves it. */
    Codependency: {
        tempo: 60,
        volume: 30,
        scale: 'harmonicMinor',
        layers: [{ instrument: 'violin', motif: [1, null, 2, 1, null, null] }],
    },

    // ── Structure and language ────────────────────────────────────────────

    /** "I am everything you make me": open, rising, patient. */
    Program: {
        tempo: 84,
        volume: 28,
        scale: 'major',
        layers: [{ instrument: 'piano', motif: [1, null, 5, null, 8, null, null, null] }],
    },
    /** A whole-tone scale has no home, and a placeholder is a held space. */
    ExpressionPlaceholder: {
        tempo: 72,
        volume: 25,
        scale: 'wholeTone',
        layers: [{ instrument: 'bell', motif: [1, null, null, null], beat: 2 }],
    },
    /** Gibberish, deliberately unsingable — it speaks only in nonsense. */
    UnparsableExpression: {
        tempo: 100,
        volume: 26,
        scale: 'chromatic',
        layers: [{ instrument: 'pitchedDog', motif: [1, 4, 2, 6, 3, null] }],
    },
    /** Eager and forward: it runs everything. */
    Evaluate: {
        tempo: 116,
        volume: 32,
        scale: 'major',
        layers: [
            { instrument: 'trumpet', motif: [1, 3, 5, 8, 5, 3, null, null] },
            { instrument: 'drums', motif: [1, null, 1, null], beat: 2, volume: 45 },
        ],
    },
    /** A definition and its evaluation, one underneath the other. */
    FunctionDefinition: {
        tempo: 88,
        volume: 29,
        scale: 'major',
        layers: [
            { instrument: 'piano', motif: [1, 5, 3, 6, 5, null, null, null] },
            { instrument: 'piano', motif: [1, null, null, null], beat: 4, key: -12, volume: 50 },
        ],
    },
    /** Two operands, a symbol in the middle: one left, one right. */
    BinaryEvaluate: {
        tempo: 104,
        volume: 28,
        scale: 'major',
        layers: [
            { instrument: 'piano', motif: [1, null, 3, null], pan: -0.6 },
            { instrument: 'piano', motif: [null, 5, null, null], pan: 0.6 },
        ],
    },
    /** One mark, one sound. */
    UnaryEvaluate: {
        tempo: 104,
        volume: 26,
        scale: 'major',
        layers: [{ instrument: 'piano', motif: [1, null, null, null], beat: 2 }],
    },
    /** It enumerates; so does this. */
    Number: {
        tempo: 120,
        volume: 28,
        scale: 'chromatic',
        layers: [{ instrument: 'piano', motif: [1, 2, 3, 4, 5, 6, 7, null] }],
    },
    /** Lyrical, quotable, a little florid. */
    TextLiteral: {
        tempo: 96,
        volume: 28,
        scale: 'lydian',
        layers: [{ instrument: 'flute', motif: [3, 5, 6, 8, 6, 5, null, null] }],
    },
    /** Exactly two pitches: on, off. */
    Boolean: {
        tempo: 120,
        volume: 26,
        scale: 'pentatonic',
        layers: [{ instrument: 'bell', motif: [1, null, 5, null] }],
    },
    /** An ordered run, in order, and back again. */
    List: {
        tempo: 104,
        volume: 29,
        scale: 'major',
        layers: [{ instrument: 'acousticGuitar', motif: [1, 2, 3, 4, 5, 4, 3, null] }],
    },
    /** Each pitch once, never repeated. */
    Set: {
        tempo: 104,
        volume: 29,
        scale: 'pentatonic',
        layers: [{ instrument: 'acousticGuitar', motif: [1, 3, 5, 8, null, null] }],
    },
    /** One to one: every left has exactly one right. */
    Map: {
        tempo: 104,
        volume: 29,
        scale: 'major',
        layers: [
            { instrument: 'acousticGuitar', motif: [1, 3, 5, null], pan: -0.6 },
            { instrument: 'bell', motif: [8, 6, 4, null], pan: 0.6 },
        ],
    },
    /** Starts on a rest, the way Block starts every line with "…". */
    Block: {
        tempo: 76,
        volume: 25,
        scale: 'minor',
        layers: [{ instrument: 'piano', motif: [null, 1, null, 3, null, null] }],
    },
    /** A name, and then the thing it names. */
    Bind: {
        tempo: 92,
        volume: 28,
        scale: 'major',
        layers: [{ instrument: 'bell', motif: [1, null, 1, null, 5, null, null, null] }],
    },
    /** A rising figure that never resolves: it only ever asks questions. */
    Conditional: {
        tempo: 100,
        volume: 28,
        scale: 'minor',
        layers: [{ instrument: 'violin', motif: [5, 6, null, 5, 6, null] }],
    },
    /** Surfer slang, surf guitar. */
    Convert: {
        tempo: 126,
        volume: 32,
        scale: 'mixolydian',
        layers: [
            { instrument: 'electricGuitar', motif: [1, 4, 5, 4, null, null, null, null] },
            { instrument: 'drums', motif: [1, null, 2, null], beat: 2, volume: 45 },
        ],
    },
    /** Descending and unhurried: a director's note. */
    Doc: {
        tempo: 68,
        volume: 25,
        scale: 'major',
        layers: [{ instrument: 'flute', motif: [5, null, 3, null, 1, null, null, null] }],
    },
    /** On cue, on the beat. */
    Reaction: {
        tempo: 128,
        volume: 31,
        scale: 'minorPentatonic',
        layers: [
            { instrument: 'drums', motif: [1, null, 1, 1, null, 1, null, null], volume: 50 },
            { instrument: 'synth', motif: [1, 3, 5, null], beat: 2 },
        ],
    },
    /** Set design: a frame, and then the furniture inside it. */
    StructureDefinition: {
        tempo: 80,
        volume: 28,
        scale: 'major',
        layers: [
            { instrument: 'synthPad', motif: [[1, 3, 5], null], beat: 4 },
            { instrument: 'piano', motif: [1, null, 5, null], beat: 2 },
        ],
    },

    // ── Output ───────────────────────────────────────────────────────────

    /** The most singable line in the set. Phrase is the star and knows it. */
    Phrase: {
        tempo: 100,
        volume: 31,
        scale: 'major',
        layers: [{ instrument: 'flute', motif: [1, 3, 5, 6, 8, 6, 5, null] }],
    },
    /** A group is the same thing, arranged: one figure at three heights. */
    Group: {
        tempo: 88,
        volume: 28,
        scale: 'major',
        layers: [
            { instrument: 'synthPad', motif: [1, 3, 5, null], beat: 2, key: -12, volume: 60 },
            { instrument: 'synthPad', motif: [1, 3, 5, null], beat: 2, volume: 60 },
            { instrument: 'synthPad', motif: [1, 3, 5, null], beat: 2, key: 12, volume: 45 },
        ],
    },
    /** ALL CAPS: the lowest, loudest, most immovable thing here. */
    Stage: {
        tempo: 60,
        volume: 34,
        scale: 'minorPentatonic',
        layers: [
            { instrument: 'didgeridoo', motif: [1, null, null, null], beat: 4 },
            { instrument: 'drums', motif: [1, null], beat: 4, volume: 55 },
        ],
    },
    /** "1, 2, 3, 4, 1, 2, 3, 4" — the scene's own title. */
    Sequence: {
        tempo: 132,
        volume: 29,
        scale: 'dorian',
        layers: [{ instrument: 'synth', motif: [1, 2, 3, 4, 5, 6, 7, null] }],
    },
    /** A pad swelling under a short figure: a scene change. */
    Scene: {
        tempo: 92,
        volume: 28,
        scale: 'major',
        layers: [
            { instrument: 'piano', motif: [1, null, 5, null], beat: 2 },
            { instrument: 'synthPad', motif: [[1, 3, 5], null], beat: 4, volume: 45 },
        ],
    },
    /** The only theme that is a whole piece: on this card the theme is the
     * lesson, so it is the scene's own four-part tune, quieter and slower. */
    Music: {
        tempo: 100,
        volume: 35,
        scale: 'major',
        layers: [
            { instrument: 'flute', motif: [1, 3, 5, 6, 5, 3, 2, null] },
            { instrument: 'synthBass', motif: [1, null, 5, null], beat: 2, key: -12, volume: 55 },
            { instrument: 'synthPad', motif: [[1, 3, 5], null, [1, 4, 6], null], beat: 2, volume: 35 },
            { instrument: 'drums', motif: [1, null, 2, null, 1, null, 2, null], volume: 45 },
        ],
    },

    // ── Input streams ────────────────────────────────────────────────────

    /** 60 beats a minute is one tick a second, exactly. */
    Time: {
        tempo: 60,
        volume: 25,
        scale: 'major',
        layers: [{ instrument: 'bell', motif: [1, null, null, null] }],
    },
    /** Typing. */
    Key: {
        tempo: 120,
        volume: 26,
        scale: 'major',
        layers: [{ instrument: 'drums', motif: [1, null, 1, 1, null, 1, null, null] }],
    },
    /** "Hummmmmmm…" — the scene's literal title. */
    Pointer: {
        tempo: 84,
        volume: 25,
        scale: 'wholeTone',
        layers: [{ instrument: 'synthPad', motif: [1, null], beat: 4 }],
    },
    /** "And... now!", and then waiting. */
    Button: {
        tempo: 100,
        volume: 26,
        scale: 'major',
        layers: [{ instrument: 'drums', motif: [1, null, null, null, null, null, null, null] }],
    },
    /** Breath into a microphone. */
    Volume: {
        tempo: 66,
        volume: 28,
        scale: 'minorPentatonic',
        layers: [{ instrument: 'didgeridoo', motif: [1, null, null, null], beat: 4 }],
    },
    /** Unpredictable, and a cat. */
    Random: {
        tempo: 112,
        volume: 26,
        scale: 'chromatic',
        layers: [{ instrument: 'pitchedCat', motif: [3, 7, 1, 6, 2, null] }],
    },
    /** Step to a place, and stop. */
    Placement: {
        tempo: 96,
        volume: 26,
        scale: 'pentatonic',
        layers: [{ instrument: 'piano', motif: [1, null, 3, null, 5, null, null, null] }],
    },
    /** Continuous and gliding; the one theme that leans on fractional bends. */
    Motion: {
        tempo: 104,
        volume: 28,
        scale: 'major',
        layers: [{ instrument: 'violin', motif: [1, 2, 3, 4, 5, 6, 7, null] }],
    },
    /** Two voices talking past each other. */
    Chat: {
        tempo: 108,
        volume: 28,
        scale: 'pentatonic',
        layers: [
            { instrument: 'pitchedCat', motif: [1, 3, null, null], pan: -0.6 },
            { instrument: 'pitchedDog', motif: [null, null, 5, null], pan: 0.6 },
        ],
    },
    /** A handshake tone. */
    Webpage: {
        tempo: 96,
        volume: 26,
        scale: 'mixolydian',
        layers: [{ instrument: 'synth', motif: [1, 6, 4, null] }],
    },
    /** Two options: one left, one right. */
    Choice: {
        tempo: 108,
        volume: 28,
        scale: 'pentatonic',
        layers: [
            { instrument: 'bell', motif: [1, null, null, null], pan: -1 },
            { instrument: 'bell', motif: [null, null, 5, null], pan: 1 },
        ],
    },
};

/** Every theme name, for the coverage test and the schema. */
export { ThemeNames, type ThemeName };
