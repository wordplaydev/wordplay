/**
 * Reading a `Music(…)` expression the way an editor needs it: the same plain
 * data the player and the sheet consume, plus the source node behind every
 * piece of it.
 *
 * **Why from source rather than from the evaluated value.** `Music.toData()`
 * already produces `MusicData`, but only for a music that is currently
 * evaluating — a paused project, an untaken conditional branch, or a project
 * that simply isn't playing has no value to read. An editor has to work on
 * all of them. And editing means replacing nodes, so the mapping from a drawn
 * note back to its source expression has to exist regardless.
 *
 * **What isn't a literal isn't editable.** `Track(cell.append(…))` computes
 * its notes, so there is no note node to replace and no way to write a click
 * back. Those tracks read as `notes: undefined` here and the editor shows them
 * read-only, which is the same thing `PaletteProperty` already does for a
 * computed property value.
 */

import { getNumber } from '@components/palette/editOutput';
import type Project from '@db/projects/Project';
import type Bind from '@nodes/Bind';
import BooleanLiteral from '@nodes/BooleanLiteral';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import ListLiteral from '@nodes/ListLiteral';
import NoneLiteral from '@nodes/NoneLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import SetLiteral from '@nodes/SetLiteral';
import Source from '@nodes/Source';
import Spread from '@nodes/Spread';
import TextLiteral from '@nodes/TextLiteral';
import { beatsForUnit } from '@output/Music/durations';
import { instrumentBinds } from '@output/Music/referencedInstruments';
import {
    clampBeats,
    clampGain,
    clampPan,
    clampTempo,
    type MusicData,
    type NoteData,
    type TrackData,
} from '@output/Music/musicData';
import { ScaleKeys, Scales, type ScaleKey } from '@output/Music/scales';

/** One track as the editor sees it. */
export type EditableTrack = {
    /** What the sheet draws and the player plays. */
    data: TrackData;
    /** The `Track(…)` expression, for editing its inputs. */
    evaluate: Evaluate;
    /**
     * The literal note list, when the `notes` input is one. Undefined means
     * the notes are computed, which is what makes this track read-only.
     */
    notes: ListLiteral | undefined;
    /** The source expression of each entry, parallel to `data.notes`. */
    entries: Expression[];
};

/** A music expression as the editor sees it. */
export type EditableMusic = {
    data: MusicData;
    evaluate: Evaluate;
    tracks: EditableTrack[];
};

/** Whether a track's notes can be edited by direct manipulation. */
export function isEditable(track: EditableTrack): boolean {
    return track.notes !== undefined;
}

/**
 * Read a `Music(…)` expression, or undefined if this isn't one.
 *
 * Anything unreadable falls back to the input's declared default, so the sheet
 * always has something coherent to draw; `notes` and `entries` are what say
 * whether it can be written back.
 */
export default function readMusic(
    project: Project,
    evaluate: Evaluate,
): EditableMusic | undefined {
    const shares = project.shares.output;
    const context = project.getNodeContext(evaluate);
    if (evaluate.getFunction(context) !== shares.Music) return undefined;

    const given = (bind: Bind) => oneInput(evaluate, bind, context);
    const inputs = shares.Music.inputs;
    const [
        tracksBind,
        tempoBind,
        keyBind,
        scaleBind,
        volumeBind,
        replayBind,
        pauseBind,
        nameBind,
        descriptionBind,
    ] = inputs;

    const scale = readScale(project, given(scaleBind)) ?? Scales.major;
    const key = getNumber(given(keyBind) ?? NumberLiteral.make(0)) ?? 0;

    const music = {
        // The name defaults to the music's position among the project's
        // musics, but a nameless music is still one music, so an empty name
        // is enough to key reconciliation off within this editor.
        name: readText(given(nameBind)) ?? '',
        tempo: clampTempo(
            getNumber(given(tempoBind) ?? NumberLiteral.make(120)) ?? 120,
        ),
        volume: clampGain(readOptionalNumber(given(volumeBind)) ?? 1),
        key,
        scale,
        replay: readBoolean(given(replayBind)) ?? false,
        pause: readBoolean(given(pauseBind)) ?? false,
        description: readText(given(descriptionBind)),
    };

    const tracks = readTracks(project, given(tracksBind)).map((track) =>
        readTrack(project, track, music.scale, music.key),
    );

    const data: MusicData = { ...music, tracks: tracks.map((t) => t.data) };
    return { data, evaluate, tracks };
}

/**
 * A cheap key for "has this music changed" — the music's own node and the
 * nodes of the tracks it resolves to.
 *
 * Reading a music means walking every note, which is the expensive part and
 * runs on every project change while the editor is open. But an edit anywhere
 * else in the program leaves this music's nodes untouched: a revise preserves
 * the identity of what it didn't replace. Comparing those identities costs a
 * few property reads and says whether the walk is needed at all.
 *
 * The track nodes are in the key, not just the music's, because a track may be
 * bound elsewhere — `melody: Track(…)` then `Music([melody])` — and editing
 * that binding re-mints the track while leaving the music alone.
 */
export function musicSignature(project: Project, evaluate: Evaluate): string {
    const context = project.getNodeContext(evaluate);
    const given = oneInput(
        evaluate,
        project.shares.output.Music.inputs[0],
        context,
    );
    const tracks = readTracks(project, given);
    return [evaluate.id, ...tracks.map((track) => track.id)].join(' ');
}

/** Every `Music(…)` expression in the project, in source and document order. */
export function musicsIn(project: Project): Evaluate[] {
    const musics: Evaluate[] = [];
    for (const source of project.getSources()) {
        // One context per source rather than one per node: this runs on every
        // project change, and an imported song has tens of thousands of nodes.
        const context = project.getContext(source);
        for (const node of source.nodes())
            if (
                node instanceof Evaluate &&
                node.getFunction(context) === project.shares.output.Music
            )
                musics.push(node);
    }
    return musics;
}

/* ------------------------------------------------------------------ *
 * Tracks
 * ------------------------------------------------------------------ */

/** `tracks` is `[🎶]|🎶`, so a lone track needn't be wrapped in a list. */
function readTracks(
    project: Project,
    given: Expression | undefined,
): Evaluate[] {
    /**
     * What a name stands for, following it as far as it goes.
     *
     * Three ways a track reaches a music, all of which a creator writes:
     * inline; bound to a name in the same source; and borrowed from another
     * source — either a shared bind (`↓ song.tracks`, how an import writes
     * itself) or a whole source whose value is its last expression
     * (`↓ guitar1`, how Lyrics is written). `resolveToLeaf` covers only the
     * first two, since it requires a `Bind`; a borrowed source resolves to a
     * `Source`, which is why all 41 of Lyrics' tracks read as none at all.
     */
    const follow = (node: Expression): Expression | undefined => {
        if (!(node instanceof Reference)) return node;
        const context = project.getNodeContext(node);
        const leaf = node.resolveToLeaf(context);
        if (leaf !== undefined) return leaf;
        // A whole source: its value is the last thing it evaluates.
        const definition = node.resolve(context);
        return definition instanceof Source
            ? definition.expression.expression.statements.at(-1)
            : undefined;
    };

    const asTrack = (node: Expression | undefined): Evaluate | undefined => {
        const resolved = node === undefined ? undefined : follow(node);
        return resolved instanceof Evaluate &&
            resolved.getFunction(project.getNodeContext(resolved)) ===
                project.shares.output.Track
            ? resolved
            : undefined;
    };

    if (given === undefined) return [];
    const lone = asTrack(given);
    if (lone !== undefined) return [lone];

    // The list may be written here or borrowed by name.
    const list = follow(given);
    if (list instanceof ListLiteral) {
        const tracks: Evaluate[] = [];
        for (const value of list.values) {
            if (value instanceof Spread) continue;
            const track = asTrack(value);
            if (track !== undefined) tracks.push(track);
        }
        return tracks;
    }
    return [];
}

function readTrack(
    project: Project,
    evaluate: Evaluate,
    musicScale: readonly number[],
    musicKey: number,
): EditableTrack {
    const context = project.getNodeContext(evaluate);
    const given = (bind: Bind) => oneInput(evaluate, bind, context);
    const [
        notesBind,
        instrumentBind,
        beatBind,
        scaleBind,
        keyBind,
        volumeBind,
        panBind,
        loopBind,
        mashBind,
    ] = project.shares.output.Track.inputs;

    const beat = readBeats(given(beatBind)) ?? 1;
    const notesGiven = given(notesBind);
    const list = notesGiven instanceof ListLiteral ? notesGiven : undefined;
    // A spread (`[:tune :rest]`) draws whatever it spreads but has no note of
    // its own to replace, so a list holding one is read-only as a whole.
    const entries: Expression[] = [];
    for (const value of list?.values ?? [])
        if (!(value instanceof Spread)) entries.push(value);
    const editable =
        list !== undefined && entries.length === list.values.length;

    const data: TrackData = {
        notes: entries.map((entry) => readNote(project, entry, beat)),
        instrument: readInstrument(project, given(instrumentBind)) ?? 'piano',
        scale: readScale(project, given(scaleBind)) ?? musicScale,
        key: readOptionalNumber(given(keyBind)) ?? musicKey,
        volume: clampGain(readOptionalNumber(given(volumeBind)) ?? 1),
        pan: clampPan(readOptionalNumber(given(panBind)) ?? 0),
        loop: readBoolean(given(loopBind)) ?? true,
        mash: readBoolean(given(mashBind)) ?? true,
    };

    return {
        data,
        evaluate,
        notes: editable ? list : undefined,
        entries: editable ? entries : [],
    };
}

/* ------------------------------------------------------------------ *
 * Notes
 * ------------------------------------------------------------------ */

/**
 * One note-list entry. The four written forms are a bare number, `ø` for a
 * rest, a `{…}` chord, and a `♪` for an entry that needs its own volume — the
 * same four `Track.toTrack` reads from values.
 */
export function readNote(
    project: Project,
    entry: Expression,
    trackBeat: number,
): NoteData {
    const rest = { degrees: [], beats: clampBeats(trackBeat), volume: 1 };
    if (entry instanceof NoneLiteral) return rest;

    if (entry instanceof SetLiteral) {
        const degrees = entry.values.map((value) => getNumber(value) ?? 0);
        // A chord's length is written on its first member, matching the doc's
        // "put the value on the first number" rule.
        const first = entry.values[0];
        return {
            degrees,
            beats: clampBeats(
                (first === undefined ? undefined : durationOf(first)) ??
                    trackBeat,
            ),
            volume: 1,
        };
    }

    if (
        entry instanceof Evaluate &&
        entry.getFunction(project.getNodeContext(entry)) ===
            project.shares.output.Note
    ) {
        const context = project.getNodeContext(entry);
        const [degreeBind, beatBind, volumeBind] =
            project.shares.output.Note.inputs;
        const degree = oneInput(entry, degreeBind, context);
        return {
            degrees:
                degree === undefined || degree instanceof NoneLiteral
                    ? []
                    : degree instanceof SetLiteral
                      ? degree.values.map((value) => getNumber(value) ?? 0)
                      : [getNumber(degree) ?? 0],
            beats: clampBeats(
                readBeats(oneInput(entry, beatBind, context)) ?? trackBeat,
            ),
            volume: clampGain(
                readOptionalNumber(oneInput(entry, volumeBind, context)) ?? 1,
            ),
        };
    }

    const degree = getNumber(entry);
    if (degree === undefined) return rest;
    return {
        degrees: [degree],
        beats: clampBeats(durationOf(entry) ?? trackBeat),
        volume: 1,
    };
}

/** A note value written as a unit on the number itself — `3𝅗𝅥`. */
function durationOf(entry: Expression): number | undefined {
    return entry instanceof NumberLiteral && entry.unit !== undefined
        ? beatsForUnit(entry.unit)
        : undefined;
}

/** A beat count, written either as `#beats` or as a note value. */
function readBeats(given: Expression | undefined): number | undefined {
    if (given === undefined) return undefined;
    return durationOf(given) ?? getNumber(given);
}

/* ------------------------------------------------------------------ *
 * Scalars
 * ------------------------------------------------------------------ */

/** The expression given for an input, ignoring variable-length inputs. */
function oneInput(
    evaluate: Evaluate,
    bind: Bind | undefined,
    context: ReturnType<Project['getNodeContext']>,
): Expression | undefined {
    if (bind === undefined) return undefined;
    const given = evaluate.getInput(bind, context);
    return Array.isArray(given) ? undefined : given;
}

/** A `…|ø` override, where `ø` means "defer to the music's". */
function readOptionalNumber(given: Expression | undefined): number | undefined {
    return given === undefined || given instanceof NoneLiteral
        ? undefined
        : getNumber(given);
}

function readBoolean(given: Expression | undefined): boolean | undefined {
    return given instanceof BooleanLiteral ? given.bool() : undefined;
}

function readText(given: Expression | undefined): string | undefined {
    // getText() rather than getValue(), which needs locales to choose among
    // translations — the editor wants the written text, not a localized pick.
    return given instanceof TextLiteral ? given.getText() : undefined;
}

/**
 * A scale, written either as a literal list of semitone offsets or as one of
 * `Music`'s statics (`🎼.major`). Recovering the key from a static follows
 * `Music.staticBuilder`: the en-US key is always among the bind's names.
 */
function readScale(
    project: Project,
    given: Expression | undefined,
): readonly number[] | undefined {
    if (given === undefined || given instanceof NoneLiteral) return undefined;

    if (given instanceof ListLiteral) {
        const offsets: number[] = [];
        for (const value of given.values) {
            const offset =
                value instanceof Spread ? undefined : getNumber(value);
            if (offset === undefined) return undefined;
            offsets.push(offset);
        }
        return offsets;
    }

    const key = scaleKeyOf(project, given);
    return key === undefined ? undefined : Scales[key];
}

function scaleKeyOf(project: Project, given: Expression): ScaleKey | undefined {
    if (!(given instanceof PropertyReference)) return undefined;
    const name = given.name?.getName();
    if (name === undefined) return undefined;
    const context = project.getNodeContext(given);
    for (const bind of project.shares.output.Music.getStaticBindsWithValues(
        context,
    )) {
        if (!bind.names.hasName(name)) continue;
        const names = bind.names.getNames();
        return ScaleKeys.find((candidate) => names.includes(candidate));
    }
    return undefined;
}

/** An instrument, written as one of `Instrument`'s statics (`🔈.piano`). */
function readInstrument(
    project: Project,
    given: Expression | undefined,
): string | undefined {
    if (!(given instanceof PropertyReference)) return undefined;
    const name = given.name?.getName();
    if (name === undefined) return undefined;
    for (const [key, bind] of instrumentBinds(project))
        if (bind.names.hasName(name)) return key;
    return undefined;
}
