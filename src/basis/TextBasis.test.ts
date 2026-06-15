import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';

test('Test text functions', () => {
    expect(evaluateCode('"hello".length()')?.toString()).toBe('5');
    expect(evaluateCode('"hello" = ø')?.toString()).toBe('⊥');
    expect(evaluateCode('"hello" ≠ ø')?.toString()).toBe('⊤');
});

test.each([
    // Combine preserves a shared locale.
    ['"hello"/en + "hi"/en', '"hellohi"/en'],
    // An untagged operand inherits the tagged side's locale.
    ['"hello"/en + "!"', '"hello!"/en'],
    ['"!" + "hello"/en', '"!hello"/en'],
    // No locale anywhere stays untagged.
    ['"a" + "b"', '"ab"'],
    // Differing locales union their languages and regions.
    ['"a"/en + "b"/es', '"ab"/en_es'],
    ['"a"/en-US + "b"/fr-CA', '"ab"/en_fr-US_CA'],
    // Appending to a tagged literal keeps the tag (the motivating bug).
    ['greeting: "hello"/en\ngreeting + "!"', '"hello!"/en'],
    // Unary/structure-preserving ops keep the source locale.
    ['"x"/en.repeat(2)', '"xx"/en'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toWordplay()).toBe(expected);
});

test('segment fragments inherit the source locale', () => {
    expect(evaluateCode('"a,b,c"/en.segment(",")')?.toWordplay()).toBe(
        '["a"/en "b"/en "c"/en]',
    );
});
