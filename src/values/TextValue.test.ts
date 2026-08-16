import evaluateCode from '@runtime/evaluate';
import { expect, test } from 'vitest';

/**
 * A language tag says what language text is written in, not which text it is, so it
 * takes no part in equality. It used to: `'x' = 'x'/en` was ⊥, which meant a check of
 * untagged input — a key press, a chat message, a plain literal — against a localized
 * word could never be true, silently. Nothing in the language said so, and nothing
 * reported it.
 */
test.each([
    ["'x' = 'x'", '⊤'],
    ["'x'/en = 'x'/en", '⊤'],
    // The case that was always false before.
    ["'x' = 'x'/en", '⊤'],
    ["'x'/en = 'x'", '⊤'],
    // Different languages, same characters: still the same text.
    ["'x'/en = 'x'/es", '⊤'],
    // Characters still decide.
    ["'x' = 'y'", '⊥'],
    ["'x'/en = 'y'/en", '⊥'],
    ["'x' ≠ 'x'/en", '⊥'],
    // A multi-translation literal evaluates to one translation — the reader's — and
    // that is what gets compared.
    ["'x' = 'x'/en,'equis'/es", '⊤'],
    ["'equis' = 'x'/en,'equis'/es", '⊥'],
])('%s is %s', (code: string, value: string) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

/** Equality also decides collection membership, so the same rule reaches these. */
test.each([
    ["{'x'/en: 1}{'x'}", '1'],
    ["['x'/en].has('x')", '⊤'],
    ["{'x'/en}{'x'}", '⊤'],
])('%s is %s', (code: string, value: string) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
