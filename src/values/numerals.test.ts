import NumberLiteral from '@nodes/NumberLiteral';
import { Sym, type SymType } from '@nodes/Sym';
import NumberValue from '@values/NumberValue';
import {
    NumeralSyms,
    numeralDigits,
    renderBase,
    renderNumeral,
} from '@values/numerals';
import Decimal from 'decimal.js';
import { expect, test } from 'vitest';

/** Read a numeral literal back the way the evaluator does. */
function read(text: string, sym: SymType): string {
    const literal = NumberLiteral.make(text, undefined, sym);
    return new NumberValue(literal, literal.number).toNumber().toString();
}

// An encoder bug would silently change a creator's number, and reading it back is the only
// thing that catches it — the text looking plausible proves nothing.
test.each(NumeralSyms.map((sym) => [sym] as const))(
    'every %s rendering reads back as the value it was given',
    (sym) => {
        let rendered = 0;
        for (let value = 0; value <= 4000; value++) {
            const text = renderNumeral(new Decimal(value), sym);
            // Declining is allowed — Roman has no zero, Han is bounded — but a lossy string
            // never is.
            if (text === undefined) continue;
            rendered++;
            expect(read(text, sym), `${sym} rendered ${value} as ${text}`).toBe(
                String(value),
            );
        }
        expect(rendered, `${sym} rendered nothing at all`).toBeGreaterThan(0);
    },
);

test('every offered digit is a real numeral in its system', () => {
    for (const sym of NumeralSyms)
        for (const digit of numeralDigits(sym))
            expect(read(digit, sym), `${sym} digit ${digit}`).not.toBe('NaN');
});

test('positional systems render fractions, and decline what they cannot write', () => {
    expect(renderNumeral(new Decimal('1.5'), Sym.ThaiNumeral)).toBe('๑.๕');
    expect(renderNumeral(new Decimal(-1), Sym.ThaiNumeral)).toBeUndefined();
    // Roman has no zero and no fractions; Han is bounded to what its encoder can round-trip.
    expect(renderNumeral(new Decimal(0), Sym.RomanNumeral)).toBeUndefined();
    expect(renderNumeral(new Decimal('1.5'), Sym.RomanNumeral)).toBeUndefined();
    expect(renderNumeral(new Decimal(4000), Sym.RomanNumeral)).toBeUndefined();
    expect(renderNumeral(new Decimal(10000), Sym.HanNumeral)).toBeUndefined();
});

test('base literals read back as the value they encode', () => {
    for (const [value, base] of [
        [10, 2],
        [255, 16],
        [7, 8],
        [0, 2],
    ] as const) {
        const text = renderBase(new Decimal(value), base);
        expect(text, `base ${base} of ${value}`).toBeDefined();
        if (text) expect(read(text, Sym.Base)).toBe(String(value));
    }
    expect(renderBase(new Decimal('1.5'), 2)).toBeUndefined();
    expect(renderBase(new Decimal(-1), 2)).toBeUndefined();
});
