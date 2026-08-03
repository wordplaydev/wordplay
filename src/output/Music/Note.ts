import toStructure from '@basis/toStructure';
import type Locales from '@locale/Locales';
import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import NoneValue from '@values/NoneValue';
import NumberValue from '@values/NumberValue';
import SetValue from '@values/SetValue';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import Valued, { getOutputInputs } from '@output/Output/Valued';
import { toNumber } from '@output/Output/Stage';
import {
    beatsForUnit,
    degreeType,
    durationTypes,
} from '@output/Music/durations';

export function createNoteType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Note, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Note.degree)}•${degreeType()}|ø|{${degreeType()}}
        ${getBind(locales, (locale) => locale.output.Note.beat)}•#beats|${durationTypes()}: 1beats
        ${getBind(locales, (locale) => locale.output.Note.volume)}•%: 100%
    )`);
}

/** A single entry in a track's notes: a rest, one degree, or a chord. */
export default class Note extends Valued {
    /** The degrees sounding together; empty is a rest. */
    readonly degrees: readonly number[];
    /** How many beats this entry lasts. */
    readonly beats: number;
    /** 0-1 gain multiplier. */
    readonly volume: number;

    constructor(
        value: Value,
        degrees: readonly number[],
        beats: number,
        volume: number,
    ) {
        super(value);
        this.degrees = degrees;
        this.beats = beats;
        this.volume = volume;
    }
}

/**
 * Read a degree value — a number, ø for a rest, or a set for a chord — into
 * a list of degrees. Undefined means the value wasn't one of those.
 */
export function toDegrees(
    value: Value | undefined,
): readonly number[] | undefined {
    if (value instanceof NoneValue) return [];
    if (value instanceof NumberValue) return [value.toNumber()];
    if (value instanceof SetValue) {
        const degrees: number[] = [];
        for (const element of value.values) {
            if (!(element instanceof NumberValue)) return undefined;
            degrees.push(element.toNumber());
        }
        return degrees;
    }
    return undefined;
}

/**
 * How long a number written with a note value lasts, in beats.
 *
 * Here the number is a *count* of that value, so `2𝅘𝅥𝅮` is two eighths — one
 * beat. A plain `#beats` number passes through unchanged. This is what
 * @Track/beat and @Note/beat read, so a grid can be declared in notation as
 * \beat: 1𝅘𝅥𝅮\ rather than \0.5beats\.
 */
export function toBeats(value: Value | undefined): number | undefined {
    if (!(value instanceof NumberValue)) return undefined;
    const duration = beatsForUnit(value.unit);
    return duration === undefined
        ? value.toNumber()
        : value.toNumber() * duration;
}

/**
 * The duration a note value written on a degree implies, or undefined when the
 * entry carries none and should last the track's beat.
 *
 * Note the deliberate asymmetry with {@link toBeats}: on a degree the number is
 * the pitch, so the unit alone says the length — `3𝅗𝅥` is degree three for a
 * half note, not three half notes. For a chord the first element carrying a
 * note value speaks for the whole chord, since its degrees sound together and
 * so cannot differ in length.
 */
export function toDuration(value: Value | undefined): number | undefined {
    if (value instanceof NumberValue) return beatsForUnit(value.unit);
    if (value instanceof SetValue)
        for (const element of value.values) {
            if (!(element instanceof NumberValue)) continue;
            const duration = beatsForUnit(element.unit);
            if (duration !== undefined) return duration;
        }
    return undefined;
}

export function toNote(value: Value | undefined): Note | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const [degreeVal, beatVal, volumeVal] = getOutputInputs(value);
    const degrees = toDegrees(degreeVal);
    // A note value on the degree is more specific than the beat input, which
    // always carries a number because it has a default, so it wins.
    const beats = toDuration(degreeVal) ?? toBeats(beatVal);
    const volume = toNumber(volumeVal);

    return degrees !== undefined && beats !== undefined && volume !== undefined
        ? new Note(value, degrees, beats, volume)
        : undefined;
}
