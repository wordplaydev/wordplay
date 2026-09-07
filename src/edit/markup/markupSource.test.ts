import Caret from '@edit/caret/Caret';
import {
    canRepresent,
    clampToMarkup,
    getMarkup,
    hasUnclosedDelimiter,
    isWholeMarkup,
    markupBounds,
    markupToSource,
    sourceToMarkup,
    unwrapMarkup,
    wrapMarkup,
} from '@edit/markup/markupSource';
import { withoutColorSelector } from '@unicode/emoji';
import { describe, expect, test } from 'vitest';

/** Markup a creator could plausibly write, including the shapes that make a
 *  naive wrapper fail: stray delimiters, unclosed runs, and a nested doc. */
const Cases: string[] = [
    '',
    'Hello',
    'Hello *bold* and /italic/ and _underline_ and ^extra^ and ~light~',
    'A @Phrase link, a @Color.random member, and a @U/1F600 codepoint',
    'A <label@https://wordplay.dev> link and a bare hi@wordplay.dev address',
    'Code \\1 + 1\\ inline',
    'Code with a doc \\¶I add two numbers¶\nƒ sum(a•# b•#) a + b\\',
    'An annotated example \\1cat + 1dog\\🪲 and a starred one \\1 + 1\\⭐',
    '$input and $#count[one thing|many things]',
    '• A bullet\n• Another bullet',
    'Two\n\nparagraphs',
    'a ¶ stray paragraph mark',
    'a ` stray backtick',
    'an unclosed \\1 + 1',
    'unmatched *bold',
    'a [ bracket ] and a | pipe',
    'doubled ** escapes and @@ escapes',
    '  leading and trailing space  ',
    '¶¶',
    'text with ¶¶ doubled',
    'an external example \\py| a = 5\\js| let a = 5;\\',
];

describe('markup round-trips through a Source', () => {
    test.each(Cases)('%j', (markup) => {
        expect(sourceToMarkup(markupToSource(markup))).toBe(markup);
    });

    test.each(Cases)('%j parses to a Markup node', (markup) => {
        expect(getMarkup(markupToSource(markup))).toBeDefined();
    });
});

describe('wrapping', () => {
    test('adds the delimiters', () => {
        expect(wrapMarkup('hi')).toBe('¶hi¶');
    });

    // Unconditional, unlike `toMarkup`: text that already begins or ends with a
    // `¶` still gets its own pair, so nothing the creator typed is absorbed
    // into the wrapper and unwrapping is exact.
    test('wraps text that already carries a delimiter', () => {
        expect(wrapMarkup('¶hi¶')).toBe('¶¶hi¶¶');
        expect(wrapMarkup('¶hi')).toBe('¶¶hi¶');
        expect(wrapMarkup('hi¶')).toBe('¶hi¶¶');
    });

    test('unwrap inverts wrap', () => {
        for (const text of Cases)
            expect(unwrapMarkup(wrapMarkup(text))).toBe(text);
    });
});

describe('caret bounds', () => {
    test('exclude the wrapper', () => {
        const source = markupToSource('hello');
        // ¶hello¶ is 7 graphemes, so the markup occupies 1..6.
        expect(markupBounds(source)).toEqual([1, 6]);
    });

    test('collapse for empty markup', () => {
        // ¶¶ is two graphemes with nothing between them.
        expect(markupBounds(markupToSource(''))).toEqual([1, 1]);
    });

    test('count graphemes, not code units', () => {
        // A single emoji is one grapheme but two UTF-16 code units; bounds that
        // counted code units would let the caret past the closing delimiter.
        const source = markupToSource('😀');
        expect(markupBounds(source)).toEqual([1, 2]);
    });
});

describe('clampToMarkup', () => {
    const source = markupToSource('hello');

    test('pulls a position off the opening delimiter', () => {
        const caret = new Caret(source, 0, undefined, undefined);
        expect(clampToMarkup(caret).position).toBe(1);
    });

    test('pulls a position off the closing delimiter', () => {
        const caret = new Caret(source, 7, undefined, undefined);
        expect(clampToMarkup(caret).position).toBe(6);
    });

    test('leaves an interior position alone, and the same caret object', () => {
        const caret = new Caret(source, 3, undefined, undefined);
        expect(clampToMarkup(caret)).toBe(caret);
    });

    test('clamps both ends of a range', () => {
        const caret = new Caret(source, [0, 7], undefined, undefined);
        expect(clampToMarkup(caret).position).toEqual([1, 6]);
    });

    test('leaves a node position alone', () => {
        const markup = getMarkup(source);
        if (markup === undefined) throw new Error('expected a markup node');
        const caret = new Caret(source, markup, undefined, undefined);
        expect(clampToMarkup(caret).position).toBe(markup);
    });
});

describe('isWholeMarkup', () => {
    test.each([
        'Hello *bold*',
        'Code \\1 + 1\\ inline',
        'Nested doc \\¶I add numbers¶\\',
        '',
    ])('%j is whole', (markup) => {
        expect(isWholeMarkup(markupToSource(markup))).toBe(true);
    });

    // A bare `¶` closes the wrapper, so the remainder parses as code. The text
    // still round-trips, but only the prefix is markup.
    test.each(['Hello ¶note¶ world', 'a ¶ stray paragraph mark'])(
        '%j is not whole',
        (markup) => {
            const source = markupToSource(markup);
            expect(isWholeMarkup(source)).toBe(false);
            // Whatever it parses to, no text is lost.
            expect(sourceToMarkup(source)).toBe(markup);
        },
    );
});

describe('emoji presentation', () => {
    // The tokenizer strips U+FE0F from all source, so a string carrying color
    // selectors comes back normalized. This is the app's existing behavior —
    // `toMarkup` does the same — but the markup editor writes its result back to
    // a locale string, so the normalization is pinned here rather than found later.
    test.each([
        ['✏️ edit', '✏ edit'],
        ["\\'🖐️'\\", "\\'🖐'\\"],
        ['1️⃣', '1⃣'],
    ])('%j normalizes to %j', (input, expected) => {
        expect(sourceToMarkup(markupToSource(input))).toBe(expected);
    });

    test('a string with no color selectors is untouched', () => {
        for (const text of Cases)
            expect(
                sourceToMarkup(markupToSource(withoutColorSelector(text))),
            ).toBe(withoutColorSelector(text));
    });
});

describe('canRepresent', () => {
    // Everything except the shapes that escape the wrapper, which get their own
    // cases below.
    const Representable = Cases.filter(
        (c) => !/[¶`]/.test(c) && !c.includes('an unclosed'),
    );

    test.each(Representable)('accepts %j', (markup) => {
        expect(canRepresent(markup)).toBe(true);
    });

    test('accepts text whose only change is an emoji color selector', () => {
        expect(canRepresent('✏️ edit')).toBe(true);
    });

    // The shapes the editor must decline, so a surface can fall back to a plain
    // field rather than silently rewriting what a creator wrote. The first three
    // are unclosed container delimiters, each of which escapes the wrapper.
    test.each([
        ['a bare ¶', 'Hello ¶note¶ world'],
        ['a stray backtick', 'a ` stray backtick'],
        ['an unclosed example', 'an unclosed \\1 + 1'],
    ])('declines text carrying %s', (_, markup) => {
        expect(canRepresent(markup)).toBe(false);
    });

    test('declines text carrying a zero-width space', () => {
        // The tokenizer drops these as whitespace. Two shipped es-MX strings have them.
        expect(canRepresent('Sol\u00eda \u200b\u200bser')).toBe(false);
    });
});

describe('hasUnclosedDelimiter', () => {
    test.each(['unmatched *bold', 'an unclosed \\1 + 1', 'half /italic'])(
        '%j is unclosed',
        (markup) => {
            expect(hasUnclosedDelimiter(markupToSource(markup))).toBe(true);
        },
    );

    test.each([
        '*bold*',
        'plain words',
        '\\1 + 1\\',
        'a <l@https://x.dev> b',
        // Not a link at all: the tokenizer only opens one when the whole
        // `<…@…>` tag follows, so a lone `<` is words and nothing is unclosed.
        'a <label@https://wordplay.dev',
    ])('%j is closed', (markup) => {
        expect(hasUnclosedDelimiter(markupToSource(markup))).toBe(false);
    });
});
