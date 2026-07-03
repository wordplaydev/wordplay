import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';
import ExceptionValue from '@values/ExceptionValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';

test('Moment evaluates to a structure', () => {
    const value = evaluateCode('Moment(2026 7 1)');
    expect(value).toBeInstanceOf(StructureValue);
});

test('Moment converts to deterministic en-US text', () => {
    // Formatting comes from committed data (see dateTimeFormats.ts), so exact
    // matches are safe: they can't drift with the environment's ICU.
    const value = evaluateCode("Moment(2026 7 1) → ''");
    expect(value).toBeInstanceOf(TextValue);
    expect(value instanceof TextValue ? value.text : undefined).toBe(
        'July 1, 2026',
    );
});

test('Moment with time parts formats date and time', () => {
    const value = evaluateCode("Moment(2026 7 1 15 30) → ''");
    expect(value instanceof TextValue ? value.text : undefined).toBe(
        'July 1, 2026 3:30:00 PM',
    );
});

test('Time-only Moment formats as a time', () => {
    const value = evaluateCode("Moment(hour: 15 minute: 30) → ''");
    expect(value instanceof TextValue ? value.text : undefined).toBe(
        '3:30:00 PM',
    );
});

test('Moment in the Hebrew calendar formats with Hebrew month names', () => {
    const value = evaluateCode(
        "Moment(5786 10 4 calendar: 'hebrew') → ''",
    );
    expect(value instanceof TextValue ? value.text : undefined).toBe(
        '4 Tamuz 5786',
    );
});

test('A Moment with no parts formats as the current date and time', () => {
    const value = evaluateCode("Moment() → ''");
    expect(value).toBeInstanceOf(TextValue);
    // The current date always includes the current (Gregorian) year.
    expect(
        value instanceof TextValue
            ? value.text.includes(String(new Date().getFullYear()))
            : false,
    ).toBe(true);
});

test('Language-tagged targets format for unselected locales', () => {
    // The bundled core data covers every locale's default calendar, so
    // `→ ''/zh` renders Chinese even when the project locale is en-US.
    const chinese = evaluateCode("Moment(2026 7 1) → ''/zh");
    expect(chinese instanceof TextValue ? chinese.text : undefined).toBe(
        '2026年7月1日',
    );
    const hindi = evaluateCode("Moment(2026 7 1) → ''/hi");
    expect(hindi instanceof TextValue ? hindi.text : undefined).toBe(
        '१ जुलाई २०२६',
    );
});

test('Era-bearing calendars render era names end to end', () => {
    // Guardrail for the committed CLDR data: a future CLDR version bump that
    // changes era rendering should fail here, visibly, in review.
    const value = evaluateCode("Moment(2026 7 1 calendar: 'japanese') → ''");
    expect(value instanceof TextValue ? value.text : undefined).toBe(
        'July 1, 8 Reiwa',
    );
});

test('An invalid time zone is an exception', () => {
    const value = evaluateCode(
        "Moment(2026 7 1 timezone: 'Mars/Olympus') → ''",
    );
    expect(value).toBeInstanceOf(ExceptionValue);
});

test('A time zone changes the moment rendered', () => {
    const value = evaluateCode(
        "Moment(2026 7 1 12 timezone: 'Asia/Tokyo') → ''",
    );
    expect(value instanceof TextValue ? value.text : undefined).toBe(
        'July 1, 2026 12:00:00 PM',
    );
});
