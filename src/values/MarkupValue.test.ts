import { expect, test } from 'vitest';
import evaluateCode from '#runtime/evaluate.ts';
import MarkupValue from '#values/MarkupValue.ts';
import { spokenText } from '#locale/spokenLanguage.ts';
import { toSpokenRuns } from '#locale/spokenLanguage.ts';

/** Evaluate to a MarkupValue (fails the test otherwise). */
function markup(code: string): MarkupValue {
    const value = evaluateCode(code);
    expect(value).toBeInstanceOf(MarkupValue);
    if (!(value instanceof MarkupValue)) throw new Error('not markup');
    return value;
}

test.each([
    // repeat: 0 → empty (mirrors text), N → N copies; length ignores formatting.
    ['`ab`.repeat(0).length()', '0'],
    ['`ab`.repeat(1).length()', '2'],
    ['`ab`.repeat(3).length()', '6'],
    ['(`ab` + `cd`).length()', '4'],
    // Formatting is ignored by the predicates/length.
    ['`*hi*`.length()', '2'],
    ["`*hi*`.has('hi')", '⊤'],
    ["`/hi/`.starts('h')", '⊤'],
    ["`*hi*`.ends('i')", '⊤'],
    // Paragraph breaks are excluded from length and predicates.
    ['`a\n\nb`.length()', '2'],
    ["`a\n\nb`.has('ab')", '⊤'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toString()).toBe(expected);
});

test('repeat(0) is empty markup', () => {
    expect(markup('`ab`.repeat(0)').markup.getPlainText()).toBe('');
});

test('combine merges single paragraphs into one', () => {
    expect(markup('`ab` + `cd`').markup.paragraphs).toHaveLength(1);
});

test('combine preserves paragraph breaks when multi-paragraph', () => {
    // [a,b] concat [c,d] merges the seam → [a, b+c, d].
    expect(markup('`a\n\nb` + `c\n\nd`').markup.paragraphs).toHaveLength(3);
});

test('repeat preserves paragraph breaks for multi-paragraph markup', () => {
    // [a,b] repeated twice, seam-merged → [a, b+a, b].
    expect(markup('`a\n\nb`.repeat(2)').markup.paragraphs).toHaveLength(3);
});

test('repeat clones copies so every node id is unique', () => {
    const ids = markup('`ab`.repeat(3)')
        .markup.nodes()
        .map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
});

test('case conversion preserves paragraph structure', () => {
    expect(markup('`a\n\nb`.uppercase()').markup.paragraphs).toHaveLength(2);
    expect(markup('`a\n\nb`.uppercase()').markup.getPlainText()).toBe('AB');
});

test('case conversion keeps unchanged tokens, so spacing survives', () => {
    // Spacing lives in a map keyed by token identity; a caseless word must come
    // back as the same object or its space is lost.
    const upper = markup('`日本語 hi`.uppercase()');
    // The caseless word is unchanged and the other is replaced; if either lost
    // its Spaces entry, the two would render run together.
    expect(upper.markup.toText()).toBe('日本語 HI');
});

// The language tag says what language markup is written in, not which markup it
// is, so it takes no part in equality — the same rule text follows.
test.each([
    ['`hi` = `hi`/en', '⊤'],
    ['`hi`/en = `hi`/ja', '⊤'],
    ['`hi`/en = `hi`/en', '⊤'],
    // Structure still decides.
    ['`*hi*` = `hi`', '⊥'],
    ['`hi` = `bye`', '⊥'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toString()).toBe(expected);
});

test('length counts graphemes, not code points', () => {
    // A family emoji is one symbol built from five code points.
    expect(evaluateCode('`👨‍👩‍👧`.length()')?.toString()).toBe('1');
});

/** Each spoken run of a markup value as `text/lang`. */
function spokenRuns(code: string) {
    return toSpokenRuns(spokenText(markup(code)), 'en-US')?.map(
        (run) => `${run.text}/${run.language}`,
    );
}

test('formatted text in one language needs no segment languages', () => {
    expect(
        markup('`hi`/en + ` there`/en').markup.metadata?.segmentLanguages,
    ).toBeUndefined();
    expect(
        markup('`hi` + `hola`').markup.metadata?.segmentLanguages,
    ).toBeUndefined();
});

test('joined formatted text keeps each segment’s language (#111)', () => {
    expect(spokenRuns('`hi `/en + `hola`/es')).toEqual(['hi /en', 'hola/es']);
});

test('repeating keeps segment languages on the copies', () => {
    expect(spokenRuns('(`hi `/en + `hola`/es).repeat(2)')).toEqual([
        'hi /en',
        'hola/es',
        'hi /en',
        'hola/es',
    ]);
});
