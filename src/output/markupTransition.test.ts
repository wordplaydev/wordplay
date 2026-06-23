import { expect, test } from 'vitest';
import Markup from '@nodes/Markup';
import UnicodeString from '@unicode/UnicodeString';
import { getMarkupTransition, truncateMarkup } from '@output/markupTransition';

function prefix(text: string, n: number): string {
    return new UnicodeString(text).substring(0, n).toString();
}

test('truncateMarkup yields the first N plain graphemes', () => {
    const m = Markup.words('*bold* and _italic_');
    const full = m.toText(); // "bold and italic"
    for (const n of [0, 1, 4, 8, new UnicodeString(full).getLength()]) {
        expect(truncateMarkup(m, n).toText()).toBe(prefix(full, n));
    }
    // Over-long counts clamp to the full text.
    expect(truncateMarkup(m, 999).toText()).toBe(full);
});

test('truncateMarkup preserves formatting of surviving text', () => {
    const m = Markup.words('*bold* text');
    // Truncate inside the bold span.
    const truncated = truncateMarkup(m, 2);
    expect(truncated.toText()).toBe('bo');
    // The surviving run is still bold (weight 700, not the default 400).
    expect(truncated.getFormats().some((f) => f.weight === 700)).toBe(true);
});

test('truncateMarkup keeps inter-word spacing', () => {
    const m = Markup.words('hello there world');
    // Truncate past the first word; the space must survive in the plain text.
    expect(truncateMarkup(m, 8).toText()).toBe('hello th');
    expect(truncateMarkup(m, 6).toText()).toBe('hello ');
});

test('getMarkupTransition starts at full start and ends at full end', () => {
    const a = Markup.words('*hello*');
    const b = Markup.words('_world_');
    const steps = getMarkupTransition(a, b);

    expect(steps[0].toText()).toBe(a.toText()); // 'hello'
    expect(steps[steps.length - 1].toText()).toBe(b.toText()); // 'world'

    // Every step's plain text is a prefix of the start or the end.
    const at = a.toText();
    const bt = b.toText();
    for (const step of steps) {
        const st = step.toText();
        expect(at.startsWith(st) || bt.startsWith(st)).toBe(true);
    }
});

test('getMarkupTransition reuses the common prefix', () => {
    const a = Markup.words('*good*');
    const b = Markup.words('*gold*'); // shares "go" with "good"
    const steps = steps_of(getMarkupTransition(a, b));
    // It should backspace only to the common prefix "go", never to empty.
    expect(steps.every((s) => s.length > 0)).toBe(true);
    expect(steps).toContain('go');
});

function steps_of(markups: Markup[]): string[] {
    return markups.map((m) => m.toText());
}
