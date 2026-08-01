import toStructure from '@basis/toStructure';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import ListValue from '@values/ListValue';
import NoneValue from '@values/NoneValue';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import Valued, { getOutputInputs } from '@output/Output/Valued';
import { toBoolean, toNumber } from '@output/Output/Stage';
import type Instrument from '@output/Music/Instrument';
import { toInstrument } from '@output/Music/Instrument';
import { toDegrees, toNote } from '@output/Music/Note';

export function createTrackType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Track, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Track.notes)}•[#|ø|{#}|♪]
        ${getBind(locales, (locale) => locale.output.Track.instrument)}•🔈: 🔈.piano
        ${getBind(locales, (locale) => locale.output.Track.beat)}•#beats: 1beats
        ${getBind(locales, (locale) => locale.output.Track.scale)}•[#semitones]|ø: ø
        ${getBind(locales, (locale) => locale.output.Track.key)}•#semitones|ø: ø
        ${getBind(locales, (locale) => locale.output.Track.volume)}•%: 100%
        ${getBind(locales, (locale) => locale.output.Track.pan)}•#: 0
        ${getBind(locales, (locale) => locale.output.Track.loop)}•?: ⊤
    )`);
}

/** One normalized entry in a track: what sounds, for how long, how loud. */
export type NoteEntry = {
    /** The degrees sounding together; empty is a rest. */
    degrees: readonly number[];
    /** Beats this entry lasts; undefined means the track's beat. */
    beats: number | undefined;
    /** 0-1 gain multiplier; undefined means the track's volume. */
    volume: number | undefined;
};

export default class Track extends Valued {
    readonly notes: readonly NoteEntry[];
    readonly instrument: Instrument;
    /** How many beats one bare entry lasts. */
    readonly beat: number;
    /** Optional scale override; undefined defers to the music's. */
    readonly scale: readonly number[] | undefined;
    /** Optional key override in semitones; undefined defers to the music's. */
    readonly key: number | undefined;
    /** 0-1 gain multiplier. */
    readonly volume: number;
    /** −1 left … 1 right. */
    readonly pan: number;
    readonly loop: boolean;

    constructor(
        value: Value,
        notes: readonly NoteEntry[],
        instrument: Instrument,
        beat: number,
        scale: readonly number[] | undefined,
        key: number | undefined,
        volume: number,
        pan: number,
        loop: boolean,
    ) {
        super(value);
        this.notes = notes;
        this.instrument = instrument;
        this.beat = beat;
        this.scale = scale;
        this.key = key;
        this.volume = volume;
        this.pan = pan;
        this.loop = loop;
    }
}

/** Read a `[#semitones]` list into plain numbers. */
export function toSemitones(
    value: Value | undefined,
): readonly number[] | undefined {
    if (!(value instanceof ListValue)) return undefined;
    const semitones: number[] = [];
    for (const element of value.values) {
        if (!(element instanceof NumberValue)) return undefined;
        semitones.push(element.toNumber());
    }
    return semitones;
}

export function toTrack(
    project: Project,
    value: Value | undefined,
): Track | undefined {
    if (
        !(
            value instanceof StructureValue &&
            value.type === project.shares.output.Track
        )
    )
        return undefined;

    const [
        notesVal,
        instrumentVal,
        beatVal,
        scaleVal,
        keyVal,
        volumeVal,
        panVal,
        loopVal,
    ] = getOutputInputs(value);

    if (!(notesVal instanceof ListValue)) return undefined;
    const notes: NoteEntry[] = [];
    for (const entry of notesVal.values) {
        if (
            entry instanceof StructureValue &&
            entry.type === project.shares.output.Note
        ) {
            const note = toNote(entry);
            if (note === undefined) return undefined;
            notes.push({
                degrees: note.degrees,
                beats: note.beats,
                volume: note.volume,
            });
        } else {
            const degrees = toDegrees(entry);
            if (degrees === undefined) return undefined;
            notes.push({ degrees, beats: undefined, volume: undefined });
        }
    }

    const instrument = toInstrument(instrumentVal);
    const beat = toNumber(beatVal);
    // The overrides are `…|ø`, so ø reads as "defer to the music's".
    const scale =
        scaleVal instanceof NoneValue ? undefined : toSemitones(scaleVal);
    const key = keyVal instanceof NoneValue ? undefined : toNumber(keyVal);
    const volume = toNumber(volumeVal);
    const pan = toNumber(panVal);
    const loop = toBoolean(loopVal);

    return instrument !== undefined &&
        beat !== undefined &&
        volume !== undefined &&
        pan !== undefined &&
        loop !== undefined
        ? new Track(
              value,
              notes,
              instrument,
              beat,
              scale,
              key,
              volume,
              pan,
              loop,
          )
        : undefined;
}
