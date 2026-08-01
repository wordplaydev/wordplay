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

export function createNoteType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Note, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Note.degree)}•#|ø|{#}
        ${getBind(locales, (locale) => locale.output.Note.beat)}•#beats: 1beats
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

export function toNote(value: Value | undefined): Note | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const [degreeVal, beatVal, volumeVal] = getOutputInputs(value);
    const degrees = toDegrees(degreeVal);
    const beats = toNumber(beatVal);
    const volume = toNumber(volumeVal);

    return degrees !== undefined && beats !== undefined && volume !== undefined
        ? new Note(value, degrees, beats, volume)
        : undefined;
}
