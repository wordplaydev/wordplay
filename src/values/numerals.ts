import Decimal from 'decimal.js';
import { Sym, type SymType } from '@nodes/Sym';

/**
 * The numeral tables Wordplay lexes, and the encoder that writes a value back out in each
 * system. Both directions live here so they can never drift: `NumberValue` reads these to
 * parse a literal, `numberFormats` inverts the positional maps to render output, and the edit
 * menu calls `renderNumeral` to offer a number in every script (numerals are the hardest thing
 * in the language to type, so the menu is how most creators will ever reach them).
 */

export const hanNumbers: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
};

export const hanOrders: Record<string, number> = {
    忽: 0.00001,
    糸: 0.0001,
    毛: 0.001,
    厘: 0.01,
    分: 0.1,
    十: 10,
    百: 100,
    千: 1000,
    万: 10000,
    億: 100000000,
    兆: 1000000000000,
};

// Positional numeral digit maps. Each script's ten digits translate one-to-one
// to Arabic '0'–'9'; the converter shares a single helper.
export const thaiDigits: Record<string, string> = {
    '๐': '0',
    '๑': '1',
    '๒': '2',
    '๓': '3',
    '๔': '4',
    '๕': '5',
    '๖': '6',
    '๗': '7',
    '๘': '8',
    '๙': '9',
};

export const bengaliDigits: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
};

export const devanagariDigits: Record<string, string> = {
    '०': '0',
    '१': '1',
    '२': '2',
    '३': '3',
    '४': '4',
    '५': '5',
    '६': '6',
    '७': '7',
    '८': '8',
    '९': '9',
};

export const gujaratiDigits: Record<string, string> = {
    '૦': '0',
    '૧': '1',
    '૨': '2',
    '૩': '3',
    '૪': '4',
    '૫': '5',
    '૬': '6',
    '૭': '7',
    '૮': '8',
    '૯': '9',
};

export const gurmukhiDigits: Record<string, string> = {
    '੦': '0',
    '੧': '1',
    '੨': '2',
    '੩': '3',
    '੪': '4',
    '੫': '5',
    '੬': '6',
    '੭': '7',
    '੮': '8',
    '੯': '9',
};

export const kannadaDigits: Record<string, string> = {
    '೦': '0',
    '೧': '1',
    '೨': '2',
    '೩': '3',
    '೪': '4',
    '೫': '5',
    '೬': '6',
    '೭': '7',
    '೮': '8',
    '೯': '9',
};

export const tamilDigits: Record<string, string> = {
    '௦': '0',
    '௧': '1',
    '௨': '2',
    '௩': '3',
    '௪': '4',
    '௫': '5',
    '௬': '6',
    '௭': '7',
    '௮': '8',
    '௯': '9',
};

export const teluguDigits: Record<string, string> = {
    '౦': '0',
    '౧': '1',
    '౨': '2',
    '౩': '3',
    '౪': '4',
    '౫': '5',
    '౬': '6',
    '౭': '7',
    '౮': '8',
    '౯': '9',
};

export const romanNumerals: Record<string, number> = {
    Ⅰ: 1,
    Ⅱ: 2,
    Ⅲ: 3,
    Ⅳ: 4,
    Ⅴ: 5,
    Ⅵ: 6,
    Ⅶ: 7,
    Ⅷ: 8,
    Ⅸ: 9,
    Ⅹ: 10,
    Ⅺ: 11,
    Ⅻ: 12,
    Ⅼ: 50,
    Ⅽ: 100,
    Ⅾ: 500,
    Ⅿ: 1000,
};

/** Every numeral system a literal can be written in, in the order the menu offers them. */
export const NumeralSyms = [
    Sym.RomanNumeral,
    Sym.HanNumeral,
    Sym.ThaiNumeral,
    Sym.BengaliNumeral,
    Sym.DevanagariNumeral,
    Sym.GujaratiNumeral,
    Sym.GurmukhiNumeral,
    Sym.KannadaNumeral,
    Sym.TamilNumeral,
    Sym.TeluguNumeral,
] as const;

const positionalDigits: Partial<Record<SymType, Record<string, string>>> = {
    [Sym.ThaiNumeral]: thaiDigits,
    [Sym.BengaliNumeral]: bengaliDigits,
    [Sym.DevanagariNumeral]: devanagariDigits,
    [Sym.GujaratiNumeral]: gujaratiDigits,
    [Sym.GurmukhiNumeral]: gurmukhiDigits,
    [Sym.KannadaNumeral]: kannadaDigits,
    [Sym.TamilNumeral]: tamilDigits,
    [Sym.TeluguNumeral]: teluguDigits,
};

/** Reverse maps ('0'–'9' → script digit), inverted from the single forward map so the two
 *  directions can't drift, and cached per system. */
const reverseCache = new Map<SymType, Record<string, string>>();
function reverseDigits(sym: SymType): Record<string, string> | undefined {
    const forward = positionalDigits[sym];
    if (forward === undefined) return undefined;
    let reverse = reverseCache.get(sym);
    if (reverse === undefined) {
        reverse = {};
        for (const [digit, arabic] of Object.entries(forward))
            reverse[arabic] = digit;
        reverseCache.set(sym, reverse);
    }
    return reverse;
}

/** The Roman forms used to compose a numeral, descending. A subset of `romanNumerals`, which
 *  also decodes Ⅺ and Ⅻ — valid to read, but composing with them gives 14 as ⅫⅡ rather than ⅩⅣ.
 *  Ⅳ and Ⅸ are single codepoints worth 4 and 9, which is why they can appear here at all:
 *  `convertRoman` sums characters, so a two-character subtractive pair like XL would read as 60.
 *  Larger tens and hundreds are therefore additive (40 is ⅩⅩⅩⅩ), as on a clock face. */
const romanComposing: [string, number][] = (
    ['Ⅿ', 'Ⅾ', 'Ⅽ', 'Ⅼ', 'Ⅹ', 'Ⅸ', 'Ⅴ', 'Ⅳ', 'Ⅰ'] as const
).map((numeral) => [numeral, romanNumerals[numeral]]);

function renderRoman(value: Decimal): string | undefined {
    // Positive integers only, and bounded: Ⅿ is the largest numeral, so anything past a few
    // thousand becomes an unreadable run of them.
    if (!value.isInteger() || value.lessThan(1) || value.greaterThan(3999))
        return undefined;
    let remaining = value.toNumber();
    let text = '';
    for (const [numeral, amount] of romanComposing)
        while (remaining >= amount) {
            text += numeral;
            remaining -= amount;
        }
    return text;
}

/** Han place markers, largest first, for the 1–9999 range this encoder covers. */
const hanPlaces: [string, number][] = [
    ['千', 1000],
    ['百', 100],
    ['十', 10],
];
const hanDigitFor = Object.fromEntries(
    Object.entries(hanNumbers).map(([character, value]) => [value, character]),
);

function renderHan(value: Decimal): string | undefined {
    // 1–9999 only. Above that the decoder's myriad grouping (万/億/兆) applies, and emitting a
    // form this encoder can't guarantee reads back identically isn't worth the reach.
    if (!value.isInteger() || value.lessThan(1) || value.greaterThan(9999))
        return undefined;
    let remaining = value.toNumber();
    let text = '';
    for (const [place, amount] of hanPlaces) {
        const count = Math.floor(remaining / amount);
        if (count > 0) {
            // 十 is written bare for a leading one (十 is 10, not 一十).
            if (!(count === 1 && amount === 10 && text === ''))
                text += hanDigitFor[count];
            text += place;
            remaining -= count * amount;
        }
    }
    if (remaining > 0) text += hanDigitFor[remaining];
    return text;
}

/**
 * Every single glyph a numeral system writes, so each one is reachable from the menu in a
 * single step. Positional scripts give '0'–'9'; Roman gives the forms it composes with; Han
 * gives its digits and its place markers, which are the pieces a larger number is built from.
 */
export function numeralDigits(sym: SymType): string[] {
    if (sym === Sym.RomanNumeral)
        return romanComposing.map(([numeral]) => numeral);
    if (sym === Sym.HanNumeral)
        return [
            ...Object.keys(hanNumbers),
            ...hanPlaces.map(([place]) => place),
        ];
    const digits = reverseDigits(sym);
    return digits === undefined
        ? []
        : Array.from({ length: 10 }, (_, digit) => digits[String(digit)]);
}

/**
 * Write a value in the given numeral system, or undefined when that system can't represent it
 * exactly — Roman has no zero and no fractions, Han is bounded here. Never returns a lossy
 * string: whatever comes back reads back as the same value.
 */
export function renderNumeral(
    value: Decimal,
    sym: SymType,
): string | undefined {
    if (sym === Sym.RomanNumeral) return renderRoman(value);
    if (sym === Sym.HanNumeral) return renderHan(value);
    const digits = reverseDigits(sym);
    if (digits === undefined) return undefined;
    // Negatives are a separate token in the grammar, and exponent notation has no digits to
    // substitute, so decline both rather than emit something that won't lex.
    if (value.isNegative()) return undefined;
    const decimal = value.toFixed();
    if (!/^[0-9]+(\.[0-9]+)?$/.test(decimal)) return undefined;
    let text = '';
    for (const character of decimal)
        text += character === '.' ? '.' : digits[character];
    return text;
}

/** Write a non-negative integer in the given base, as Wordplay's `base;digits` literal. */
export function renderBase(value: Decimal, base: number): string | undefined {
    if (!value.isInteger() || value.isNegative() || base < 2 || base > 16)
        return undefined;
    return `${base};${value.toNumber().toString(base).toUpperCase()}`;
}
