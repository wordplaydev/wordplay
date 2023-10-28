import { test, expect } from 'vitest';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import NumberValue from '@values/NumberValue';
import evaluateCode from '../runtime/evaluate';
import { toTokens } from '../parser/toTokens';
import { parseNumber } from '../parser/parseExpression';

test.each([
    // Test JavaScript number translation.
    ['18.2', '18.2'],
    ['0.000000001', '1e-9'],

    // Test token number translation.
    ['18.2', '18.2'],
    ['200302.123', '200302.123'],
    ['0.000000001', '1e-9'],
    ['001.100', '1.1'],
    ['1000', '1000'],
    ['∞', '∞'],
    ['-∞', '-∞'],

    // Test Japanese numbers.
    ['十', '10'],
    ['二十', '20'],
    ['二万', '20000'],
    ['二十・二分', '20.2'],
    ['九万九千九百九十九・九分九厘九毛九糸九忽', '99999.99999'],
    ['99万', '990000'],

    // Test roman numerals.
    ['Ⅹ', '10'],
    ['ⅩⅩ', '20'],
    ['ⅩⅩⅩⅠⅩ', '39'],
    ['ⅭⅭⅩⅬⅤⅠ', '246'],
    ['ⅮⅭⅭⅬⅩⅩⅩⅠⅩ', '789'],
    ['ⅯⅯⅭⅮⅩⅩⅠ', '2421'],

    // Bases
    ['2;10101.01', '21.25'],
])('%s should be %s', (text, value) => {
    const literal = parseNumber(toTokens(text));
    expect(new NumberValue(literal, literal.number).toString()).toBe(value);
});

test.each([
    [`1 = 1`, TRUE_SYMBOL],
    [`1 = 2`, FALSE_SYMBOL],
    [`1m = 1m`, TRUE_SYMBOL],
    [`1m = 1`, FALSE_SYMBOL],
    [`1 = ø`, FALSE_SYMBOL],
    ['5 < 3', FALSE_SYMBOL],
    ['5 < 10', TRUE_SYMBOL],
    ['100.1 < 100.2', TRUE_SYMBOL],
    ['100.1 < 100.2', TRUE_SYMBOL],
    ['-1 < -100', FALSE_SYMBOL],
    ['-100 < -1', TRUE_SYMBOL],
    ['-1 > -100', TRUE_SYMBOL],
    ['-100 > -1', FALSE_SYMBOL],
    ['1 + 2', '3'],
    ['1 + 10', '11'],
    ['-1 + -100', '-101'],
    ['1.1 + 2.882', '3.982'],
    ['1.1 + 2.982', '4.082'],
    ['2791 + -169.9', '2621.1'],
    ['1 - -1', '2'],
    ['1 - -9', '10'],
    ['-1 - -100', '99'],
    ['1.1 - 2.882', '-1.782'],
    ['1.1 - 2.982', '-1.882'],
    ['11 · 12', '132'],
    ['-11 · -132', '1452'],
    ['11 · -12', '-132'],
    ['0.11 · -0.12', '-0.0132'],
    ['1 · 1', '1'],
    ['1 · 0', '0'],
    ['1 ÷ 1', '1'],
    ['0 ÷ 1', '0'],
    ['1 ÷ 0', 'ø'],
    ['10 ÷ 5', '2'],
    ['-10 ÷ -5', '2'],
    ['1 ÷ 3', '0.33333333333333333333'],
    ['1 ÷ 2', '0.5'],
    ['11 ÷ 2', '5.5'],
    ['0.11 ÷ 2', '0.055'],
    ['2.1 ÷ 0.1', '21'],
    ['-2.1 ÷ 0.1', '-21'],
    ['2.1 ÷ -0.1', '-21'],
    ['1.min(0)', '0'],
    ['1.min(1)', '1'],
    ['1.min(2)', '1'],
    ['1m.min(2m)', '1m'],
    ['1.max(0)', '1'],
    ['1.max(2 3)', '3'],
    ['1.max(0 -1)', '1'],
    ['1m.max()', '!ValueException'],
    ['1 = ø', '⊥'],
    ['1 ≠ ø', '⊤'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

test.each([
    ['1 √ 2', '1'],
    ['4 √ 2', '2'],
    ['4m √ 2', '2/m'],
    ['4m^2 √ 2', '2m'],
    ['4m^m/s √ 2', '2m/s^2'],

    ['2 ^ 8', '256'],
    ['2m ^ 2', '4m^2'],
    ['2m/s ^ 2', '4m^2/s^2'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

test.each([
    // PERCENT
    ['1%', '0.01'],

    // TEXT
    ["1→''", '"1"'],
    // Numbers to text should be arabic by default
    ["1→''", '"1"'],
    // Text to numbers assume arabic by default
    ["'1'→#", '1'],
    // Numbers with units should work too
    ["1m→''", '"1m"'],
    // Union types should work
    // ["(1 < 2 ? 0 [0]) → ''", '0'],
    // Non-numbers !should be !nan
    ["'1.1.1'→#", '!#'],

    // TIME
    // No change if matching type.
    ['1s→#s', '1s'],
    // Seconds/minutes
    ['60s→#min', '1min'],
    ['1min→#s', '60s'],
    // Seconds/hours
    ['3600s→#h', '1h'],
    ['1h→#s', '3600s'],
    // Seconds/days
    ['86400s→#day', '1day'],
    ['1day→#s', '86400s'],
    // Minutes/hours
    ['60min→#h', '1h'],
    ['1h→#min', '60min'],
    // Minutes/days
    ['1440min→#day', '1day'],
    ['1day→#min', '1440min'],
    // Hours/days
    ['24h→#day', '1day'],
    ['1day→#h', '24h'],
    // Days/weeks
    ['1wk→#day', '7day'],
    ['14day→#wk', '2wk'],

    // DISTANCE
    // Direct conversions
    ['1m→#pm', '1000000000000pm'],
    ['1m→#nm', '1000000000nm'],
    ['1m→#µm', '1000000µm'],
    ['1m→#mm', '1000mm'],
    ['1m→#cm', '100cm'],
    ['1m→#dm', '10dm'],
    ['1m→#km', '0.001km'],
    ['1m→#Mm', '0.000001Mm'],
    ['1m→#Gm', '1e-9Gm'],
    ['1m→#Tm', '1e-12Tm'],
    ['1m→#ft', '3.2808398950131233596ft'],

    // Transitive conversions
    ['1km→#cm', '100000cm'],

    // WEIGHT
    ['1kg→#oz', '35.274oz'],
    ['1kg→#oz', '35.274oz'],
    ['1000mg→#lb', '0.002204625lb'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
