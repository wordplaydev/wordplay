import NumberType from '@nodes/NumberType';
import Unit from '@nodes/Unit';
import parseType from '@parser/parseType';
import { toTokens } from '@parser/toTokens';
import { describe, expect, test } from 'vitest';
import {
    beatsForUnit,
    degreeType,
    Dot,
    DotFactor,
    durationTypes,
    Eighth,
    Half,
    NoteDurations,
    PlainDurations,
    Quarter,
    Sixteenth,
    Whole,
} from './durations';

/** Read a unit the way a creator would write one, through the real parser.
 * A parsed number type always carries a concrete unit; only a basis-declared
 * one carries a deriver. */
function unitOf(text: string) {
    const type = parseType(toTokens(`#${text}`));
    if (!(type instanceof NumberType) || !(type.unit instanceof Unit))
        throw new Error(`${text} did not parse as a number type with a unit`);
    return type.unit;
}

describe('spellings', () => {
    // All Wordplay source is NFC-normalized, so a table entry that isn't
    // already NFC would never match what the editor stores.
    test.each(NoteDurations.map((d) => [d.unit] as const))(
        'is unchanged by normalization',
        (unit) => {
            expect(unit.normalize()).toBe(unit);
            expect(unit.normalize('NFC')).toBe(unit);
        },
    );

    test('are distinct', () => {
        expect(new Set(NoteDurations.map((d) => d.unit)).size).toBe(
            NoteDurations.length,
        );
    });

    test('decompose from the precomposed characters', () => {
        expect('\u{1D15D}'.normalize()).toBe(Whole);
        expect('\u{1D15E}'.normalize()).toBe(Half);
        expect('\u{1D15F}'.normalize()).toBe(Quarter);
        expect('\u{1D160}'.normalize()).toBe(Eighth);
        expect('\u{1D161}'.normalize()).toBe(Sixteenth);
    });
});

describe('durations', () => {
    test('covers ten values, plain and dotted', () => {
        expect(NoteDurations).toHaveLength(10);
        expect(PlainDurations).toHaveLength(5);
    });

    test.each(PlainDurations.map((d) => [d.unit, d.beats] as const))(
        'dots to one and a half times as long',
        (unit, beats) => {
            const dotted = NoteDurations.find((d) => d.unit === unit + Dot);
            expect(dotted?.beats).toBe(beats * DotFactor);
        },
    );

    test('anchors a quarter at one beat', () => {
        // The whole scheme rests on this: a quarter is a beat, so the glyph a
        // creator writes is the glyph the sheet draws back.
        expect(NoteDurations.find((d) => d.unit === Quarter)?.beats).toBe(1);
        expect(NoteDurations.find((d) => d.unit === Whole)?.beats).toBe(4);
        expect(NoteDurations.find((d) => d.unit === Sixteenth)?.beats).toBe(
            0.25,
        );
    });

    test('halves at every step down', () => {
        for (let index = 1; index < PlainDurations.length; index++)
            expect(PlainDurations[index].beats * 2).toBe(
                PlainDurations[index - 1].beats,
            );
    });
});

describe('beatsForUnit', () => {
    test.each(NoteDurations.map((d) => [d.unit, d.beats] as const))(
        'reads a note value off a parsed unit',
        (unit, beats) => {
            expect(beatsForUnit(unitOf(unit))).toBe(beats);
        },
    );

    test.each([['beats'], ['kitty'], ['s'], ['']])(
        'ignores a unit that is not a note value',
        (unit) => {
            expect(beatsForUnit(unitOf(unit))).toBeUndefined();
        },
    );

    test('ignores arithmetic on a note value', () => {
        // `𝅗𝅥^2` and `𝅗𝅥/s` are units derived from a note value, not durations
        // anyone writes in a note list.
        expect(beatsForUnit(unitOf(`${Half}^2`))).toBeUndefined();
        expect(beatsForUnit(unitOf(`${Half}/s`))).toBeUndefined();
        expect(beatsForUnit(unitOf(`${Half}·${Quarter}`))).toBeUndefined();
    });
});

describe('type generation', () => {
    test('round-trips through the parser byte for byte', () => {
        // If a generated alternative didn't survive parsing, the declarations
        // in Track and Note would silently mean something else.
        for (const source of [durationTypes(), degreeType()])
            expect(parseType(toTokens(source)).toWordplay()).toBe(source);
    });

    test('round-trips inside the list and set types Track declares', () => {
        for (const source of [
            `[${degreeType()}|ø|{${degreeType()}}]`,
            `#beats|${durationTypes()}`,
        ])
            expect(parseType(toTokens(source)).toWordplay()).toBe(source);
    });

    test('names every duration once', () => {
        expect(durationTypes().split('|')).toHaveLength(NoteDurations.length);
        expect(degreeType().split('|')[0]).toBe('#!');
    });
});
