import { expect, test } from 'vitest';
import Markup from '@nodes/Markup';
import UnicodeString from '@unicode/UnicodeString';
import {
    getMarkupRandomTransition,
    getMarkupRewriteTransition,
    getMarkupTransition,
    markupGraphemes,
    replaceMarkupText,
    truncateMarkup,
} from '@output/markupTransition';

/** A tiny deterministic linear congruential generator for repeatable tests. */
function seeded(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

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

test('getFormats resolves a codepoint reference to its character', () => {
    // A `@U/<hex>` reference renders as its character in output formats.
    const m = Markup.words('check @U/2713');
    expect(
        m
            .getFormats()
            .map((f) => f.text)
            .join(''),
    ).toContain('✓');
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

test('getMarkupTransition never blanks between non-empty texts', () => {
    // 'hello' and 'world' share no prefix; the morph still never blanks.
    const steps = steps_of(
        getMarkupTransition(Markup.words('*hello*'), Markup.words('_world_')),
    );
    expect(steps.every((s) => s.length > 0)).toBe(true);
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

test('replaceMarkupText swaps every position but keeps the formatting', () => {
    const m = Markup.words('*bold* and /italic/');
    const entries = markupGraphemes(m).map(() => 'x');
    const swapped = replaceMarkupText(m, entries);
    const formats = swapped.getFormats();
    // Every character was replaced, and the count is preserved.
    const joined = formats.map((f) => f.text).join('');
    expect([...joined].every((c) => c === 'x')).toBe(true);
    expect(joined.length).toBe(entries.length);
    // The bold and italic runs survive.
    expect(formats.some((f) => f.weight === 700)).toBe(true);
    expect(formats.some((f) => f.italic)).toBe(true);
});

test('getMarkupRewriteTransition wears the target formatting and ends exactly', () => {
    const a = Markup.words('plain old');
    const b = Markup.words('*bold new!*');
    const steps = getMarkupRewriteTransition(a, b, seeded(1));
    // One replacement per position of the longer text, plus the start.
    expect(steps.length).toBe(
        Math.max(markupGraphemes(a).length, markupGraphemes(b).length) + 1,
    );
    expect(steps.at(-1)?.toText()).toBe(b.toText());
    // Never blank, and every step (including the start) is dressed in the
    // target's bold formatting.
    for (const step of steps) {
        expect(step.toText().length).toBeGreaterThan(0);
        expect(step.getFormats().every((f) => f.weight === 700)).toBe(true);
    }
});

test('getMarkupRandomTransition wears the target formatting and locks exactly', () => {
    const a = Markup.words('_start_');
    const b = Markup.words('*finish*');
    const steps = getMarkupRandomTransition(
        a,
        b,
        ['q', 'w', 'z'],
        10,
        seeded(2),
    );
    expect(steps.length).toBe(10);
    expect(steps.at(-1)?.toText()).toBe(b.toText());
    for (const step of steps) {
        expect(step.toText().length).toBeGreaterThan(0);
        expect(step.getFormats().every((f) => f.weight === 700)).toBe(true);
    }
});
