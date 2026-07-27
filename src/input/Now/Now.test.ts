import { expect, test } from 'vitest';
import { frequencyToMilliseconds } from '@input/Now/Now';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import evaluateCode from '@runtime/evaluate';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';

test('Now evaluates to a Moment structure', () => {
    const value = evaluateCode('Now()');
    expect(value).toBeInstanceOf(StructureValue);
});

test("Now's timezone and calendar configure the Moments it makes", () => {
    const timezone = evaluateCode("Now(1s 'Asia/Tokyo' 'hebrew').timezone");
    expect(timezone instanceof TextValue ? timezone.text : undefined).toBe(
        'Asia/Tokyo',
    );
    const calendar = evaluateCode("Now(1s 'Asia/Tokyo' 'hebrew').calendar");
    expect(calendar instanceof TextValue ? calendar.text : undefined).toBe(
        'hebrew',
    );
});

test('Now Moments convert to localized text', () => {
    const value = evaluateCode("Now() → ''");
    expect(value).toBeInstanceOf(TextValue);
    const text = value instanceof TextValue ? value.text : '';
    expect(text).toContain(String(new Date().getFullYear()));
    // The formatted date/time, not the structure serialized as code — this
    // regressed once when NameType-typed stream outputs missed the structure's
    // own conversion and fell back to the generic structure→text one.
    expect(text).not.toContain('📅');
    expect(text).toMatch(/\d{1,2}:\d{2}:\d{2}/);
});

test('Frequencies convert to milliseconds', () => {
    const number = (value: number, unit: string) => {
        const literal = NumberLiteral.make(value, Unit.reuse([unit]));
        return new NumberValue(literal, literal.number, literal.unit);
    };
    expect(frequencyToMilliseconds(undefined)).toBe(1000);
    expect(frequencyToMilliseconds(number(5, 's'))).toBe(5000);
    expect(frequencyToMilliseconds(number(5, 'min'))).toBe(300000);
    expect(frequencyToMilliseconds(number(2, 'h'))).toBe(7200000);
    expect(frequencyToMilliseconds(number(-1, 's'))).toBe(1000);
});
