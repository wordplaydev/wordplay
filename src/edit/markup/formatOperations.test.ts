import Caret from '@edit/caret/Caret';
import {
    enclosingExample,
    insertConceptLink,
    insertExample,
    insertWebLink,
    toggleBullet,
    toggleDefect,
    toggleFormat,
    toggleHighlight,
    continueBullet,
    moveByCharacter,
    moveByWord,
    paragraphAt,
    wordAt,
} from '@edit/markup/formatOperations';
import {
    getMarkup,
    markupToSource,
    sourceToMarkup,
} from '@edit/markup/markupSource';
import Words from '@nodes/Words';
import type { Format } from '@nodes/Words';
import UnicodeString from '@unicode/UnicodeString';
import { describe, expect, test } from 'vitest';

/**
 * Formatting is expressed against the markup string, with `|` marking a collapsed
 * caret and `[…]` marking a selection, so a case reads as what a creator sees.
 *
 * Offsets are counted in GRAPHEMES, matching `Caret.position`. Slicing these by
 * UTF-16 index instead puts the marker inside the surrogate pair of a `🪲`, which
 * is the same hazard `syncMirror` converts for at the DOM boundary.
 */
function cut(text: string, start: number, end?: number): string {
    return new UnicodeString(text).substring(start, end).toString();
}

function graphemeIndexOf(text: string, marker: string): number {
    return new UnicodeString(text).getGraphemes().indexOf(marker);
}

function parseMarkupWithCaret(spec: string): {
    markup: string;
    position: number | [number, number];
} {
    if (spec.includes('[')) {
        const open = graphemeIndexOf(spec, '[');
        const close = graphemeIndexOf(spec, ']');
        const markup =
            cut(spec, 0, open) +
            cut(spec, open + 1, close) +
            cut(spec, close + 1);
        return { markup, position: [open, close - 1] };
    }
    const at = graphemeIndexOf(spec, '|');
    return { markup: cut(spec, 0, at) + cut(spec, at + 1), position: at };
}

function render(
    source: ReturnType<typeof markupToSource>,
    caret: Caret,
): string {
    const markup = sourceToMarkup(source);
    const position = caret.position;
    // Caret positions include the `¶` wrapper, so shift by one to express them
    // against the markup the creator sees.
    if (typeof position === 'number')
        return cut(markup, 0, position - 1) + '|' + cut(markup, position - 1);
    if (Array.isArray(position)) {
        // A range is [anchor, focus], so extending backwards makes it descending —
        // `expandInline`'s own convention. Sort for display, since what is rendered
        // is what is selected; the anchor is asserted by the shrink cases below.
        const [start, end] = [
            Math.min(position[0], position[1]),
            Math.max(position[0], position[1]),
        ];
        return (
            cut(markup, 0, start - 1) +
            '[' +
            cut(markup, start - 1, end - 1) +
            ']' +
            cut(markup, end - 1)
        );
    }
    return markup;
}

function apply(spec: string, format: Format): string {
    const { markup, position } = parseMarkupWithCaret(spec);
    const source = markupToSource(markup);
    // Positions in the source include the leading `¶`.
    const shifted: number | [number, number] =
        typeof position === 'number'
            ? position + 1
            : [position[0] + 1, position[1] + 1];
    const caret = new Caret(source, shifted, undefined, undefined);
    const result = toggleFormat(caret, format);
    if (result === undefined) return 'REFUSED';
    return render(result[0], result[1]);
}

describe('adding a format', () => {
    test.each([
        // A collapsed caret inserts the pair and lands inside it, so typing continues in the run.
        ['hello |world', 'bold', 'hello *|*world'],
        ['|', 'bold', '*|*'],
        // A selection is wrapped and stays selected, so a second format can be applied to it.
        ['hello [world]', 'bold', 'hello *[world]*'],
        ['[hello] world', 'italic', '/[hello]/ world'],
        ['hello [world]', 'underline', 'hello _[world]_'],
        ['hello [world]', 'light', 'hello ~[world]~'],
        ['hello [world]', 'extra', 'hello ^[world]^'],
        // Wrapping part of a word is legal; markup has no word boundaries.
        ['he[ll]o', 'bold', 'he*[ll]*o'],
    ] as [string, Format, string][])(
        '%s + %s = %s',
        (spec, format, expected) => {
            expect(apply(spec, format)).toBe(expected);
        },
    );
});

describe('removing a format', () => {
    test.each([
        // The caret merely inside the run is enough: the command finds the enclosing
        // Words and strips its delimiters, wherever they are.
        ['*bo|ld*', 'bold', 'bo|ld'],
        ['/ital|ic/', 'italic', 'ital|ic'],
        ['_under|line_', 'underline', 'under|line'],
        ['~lig|ht~', 'light', 'lig|ht'],
        ['^ext|ra^', 'extra', 'ext|ra'],
        // A selection spanning exactly the run's content also removes it.
        ['*[bold]*', 'bold', '[bold]'],
        // Surrounding prose is untouched.
        ['a *bo|ld* b', 'bold', 'a bo|ld b'],
    ] as [string, Format, string][])(
        '%s − %s = %s',
        (spec, format, expected) => {
            expect(apply(spec, format)).toBe(expected);
        },
    );
});

describe('toggling is not blind', () => {
    // A different format nested inside is added, not confused for the enclosing one.
    test('adds a second format inside an existing run', () => {
        expect(apply('*[bold]*', 'italic')).toBe('*/[bold]/*');
    });

    // A caret inside a bold run asked for italic must add italic.
    test('adds a format the enclosing run does not have', () => {
        expect(apply('*bo|ld*', 'italic')).toBe('*bo/|/ld*');
    });

    // Only a run containing the WHOLE span counts as enclosing; a partial overlap
    // is a request to format the unformatted part.
    test('a span reaching outside the run adds rather than removes', () => {
        expect(apply('*bo[ld* ta]il', 'bold')).toBe('*bo*[ld* ta]*il');
    });
});

describe('round-tripping', () => {
    test.each(['bold', 'italic', 'underline', 'light', 'extra'] as Format[])(
        'adding then removing %s returns the original',
        (format) => {
            const added = apply('hello [world]', format);
            // Feed the result back in, with the same selection.
            expect(apply(added, format)).toBe('hello [world]');
        },
    );
});

describe('the result parses to the format that was asked for', () => {
    // Textual splicing is only correct if the tokenizer agrees, so assert against
    // the parsed tree rather than the string.
    function formatsIn(markup: string): string[] {
        const source = markupToSource(markup);
        const root = getMarkup(source);
        if (root === undefined) return [];
        return root
            .nodes()
            .filter((n): n is Words => n instanceof Words)
            .map((w) => w.getFormat())
            .filter((f): f is Format => f !== undefined);
    }

    test.each(['bold', 'italic', 'underline', 'light', 'extra'] as Format[])(
        'wrapping a selection in %s produces a Words run of that format',
        (format) => {
            const result = apply('hello [world]', format).replace(
                /[[\]|]/g,
                '',
            );
            expect(formatsIn(result)).toContain(format);
        },
    );

    test('removing leaves no run of that format', () => {
        const removed = apply('a *[bold]* b', 'bold').replace(/[[\]|]/g, '');
        expect(formatsIn(removed)).not.toContain('bold');
    });

    test('nesting produces both formats', () => {
        const nested = apply('*[bold]*', 'italic').replace(/[[\]|]/g, '');
        expect(formatsIn(nested).sort()).toEqual(['bold', 'italic']);
    });
});

/** Run any operation that takes only a caret, in the same `|`/`[…]` notation. */
function run(
    spec: string,
    op: (
        caret: Caret,
    ) => [ReturnType<typeof markupToSource>, Caret] | undefined,
): string {
    const { markup, position } = parseMarkupWithCaret(spec);
    const source = markupToSource(markup);
    const shifted: number | [number, number] =
        typeof position === 'number'
            ? position + 1
            : [position[0] + 1, position[1] + 1];
    const result = op(new Caret(source, shifted, undefined, undefined));
    return result === undefined ? 'REFUSED' : render(result[0], result[1]);
}

describe('examples and links', () => {
    test('wrapping a selection makes it a code example', () => {
        expect(run('say [1 + 1] now', insertExample)).toBe(
            'say \\[1 + 1]\\ now',
        );
    });

    test('a collapsed caret opens an empty example and lands inside', () => {
        expect(run('say | now', insertExample)).toBe('say \\|\\ now');
    });

    test('a link wraps the selection as its description and selects the URL', () => {
        expect(run('see [Wordplay] now', insertWebLink)).toBe(
            'see <Wordplay@[https://example.com]> now',
        );
    });

    test('a concept link replaces the selection', () => {
        expect(
            run('see [that] now', (c) => insertConceptLink(c, 'Phrase')),
        ).toBe('see @Phrase| now');
    });
});

describe('bullets', () => {
    test.each([
        ['fir|st', '• fir|st'],
        ['a\nfir|st', 'a\n• fir|st'],
    ])('%j gains a bullet', (spec, expected) => {
        expect(run(spec, toggleBullet)).toBe(expected);
    });

    test('a bulleted line loses its bullet', () => {
        expect(run('• fir|st', toggleBullet)).toBe('fir|st');
    });
});

describe('example annotations', () => {
    // The old editor found the enclosing example by counting `\` in the string;
    // these are node lookups, so they know when they do not apply.
    test('the caret outside any example refuses', () => {
        expect(run('just pro|se', toggleHighlight)).toBe('REFUSED');
        expect(run('just pro|se', toggleDefect)).toBe('REFUSED');
    });

    // The caret stays in the code through all of these: the annotation is
    // metadata about the example, not a place to type, so the command can be
    // repeated without re-aiming.
    test('adds and removes a highlight', () => {
        expect(run('\\1 +| 1\\', toggleHighlight)).toBe('\\1 +| 1\\⭐');
        expect(run('\\1 +| 1\\⭐', toggleHighlight)).toBe('\\1 +| 1\\');
    });

    test('adds and removes a defect', () => {
        expect(run('\\1 +| 1\\', toggleDefect)).toBe('\\1 +| 1\\🪲');
        expect(run('\\1 +| 1\\🪲', toggleDefect)).toBe('\\1 +| 1\\');
    });

    test('both annotations can coexist', () => {
        expect(run('\\1 +| 1\\⭐', toggleDefect)).toBe('\\1 +| 1\\⭐🪲');
    });

    test('enclosingExample finds the example the caret is in', () => {
        const source = markupToSource('a \\1 + 1\\ b');
        // Position 5 is inside the example's program.
        const caret = new Caret(source, 5, undefined, undefined);
        expect(enclosingExample(caret)).toBeDefined();
        const outside = new Caret(source, 1, undefined, undefined);
        expect(enclosingExample(outside)).toBeUndefined();
    });
});

describe('moving by character', () => {
    /** Run a sequence of arrow presses over a markup string, rendering each stop. */
    function walk(spec: string, steps: (-1 | 1)[], extend = false): string[] {
        const { markup, position } = parseMarkupWithCaret(spec);
        const source = markupToSource(markup);
        let caret = new Caret(
            source,
            typeof position === 'number'
                ? position + 1
                : [position[0] + 1, position[1] + 1],
            undefined,
            undefined,
        );
        return steps.map((direction) => {
            const result = moveByCharacter(caret, direction, extend);
            if (result === undefined) return 'REFUSED';
            caret = result[1];
            return render(result[0], caret);
        });
    }

    test('left from the end steps one character, rather than selecting the node', () => {
        // Regression: `moveInlineText` selected the whole `Words` here, because the
        // end of the markup is always the `¶` wrapper's boundary. A creator pressing
        // left once and then shift+left twice got the whole paragraph bolded.
        expect(walk('Welcome to Wordplay.|', [-1, -1, -1])).toEqual([
            'Welcome to Wordplay|.',
            'Welcome to Wordpla|y.',
            'Welcome to Wordpl|ay.',
        ]);
    });

    test('right from the start steps one character', () => {
        expect(walk('|Hello', [1, 1])).toEqual(['H|ello', 'He|llo']);
    });

    test('motion stops at the markup, never entering the wrapper', () => {
        expect(walk('|Hi', [-1, -1])).toEqual(['|Hi', '|Hi']);
        expect(walk('Hi|', [1, 1])).toEqual(['Hi|', 'Hi|']);
    });

    test('shift extends from a collapsed caret and keeps the anchor', () => {
        expect(walk('Welcome to Wordplay.|', [-1, -1, -1], true)).toEqual([
            'Welcome to Wordplay[.]',
            'Welcome to Wordpla[y.]',
            'Welcome to Wordpl[ay.]',
        ]);
    });

    test('an unshifted arrow collapses a selection to the edge it moved toward', () => {
        expect(walk('Hello [big] world', [-1])).toEqual(['Hello |big world']);
        expect(walk('Hello [big] world', [1])).toEqual(['Hello big| world']);
    });

    test('shift can shrink a selection back toward its anchor', () => {
        expect(walk('Hello [big] world', [-1, -1], true)).toEqual([
            'Hello [bi]g world',
            'Hello [b]ig world',
        ]);
    });

    test('a grapheme is one step, not a code unit', () => {
        // `🪲` is two UTF-16 units; stepping by one must not land inside it.
        expect(walk('a🪲b|', [-1, -1])).toEqual(['a🪲|b', 'a|🪲b']);
    });
});

describe('continuing a bullet', () => {
    function press(spec: string): string {
        const { markup, position } = parseMarkupWithCaret(spec);
        const source = markupToSource(markup);
        const caret = new Caret(
            source,
            typeof position === 'number'
                ? position + 1
                : [position[0] + 1, position[1] + 1],
            undefined,
            undefined,
        );
        const result = continueBullet(caret);
        // Declining is the contract: the ordinary line insert takes it from here.
        if (result === undefined) return 'DECLINED';
        return render(result[0], result[1]);
    }

    test('Enter at the end of a bulleted line starts the next bullet', () => {
        expect(press('• first item|')).toBe('• first item\n• |');
    });

    test('Enter mid-item splits it and bullets the remainder', () => {
        expect(press('• first |item')).toBe('• first \n• |item');
    });

    test('Enter on an empty bullet ends the list and starts a paragraph', () => {
        // The blank line matters: items are separated by a single newline, so
        // without it the caret would still be inside the last item's paragraph.
        expect(press('• one\n• |')).toBe('• one\n\n|');
    });

    test('ending a list that is the whole document leaves no leading blank line', () => {
        expect(press('• |')).toBe('|');
    });

    test('an unbulleted line is declined, so an ordinary line break happens', () => {
        expect(press('plain text|')).toBe('DECLINED');
        expect(press('|')).toBe('DECLINED');
    });

    test('a selection is declined, since Enter over one is a replacement', () => {
        expect(press('• [first] item')).toBe('DECLINED');
    });

    test('the rule is per line, not per document', () => {
        expect(press('intro\n\n• item|')).toBe('intro\n\n• item\n• |');
        expect(press('• item\n\nafter|')).toBe('DECLINED');
    });
});

describe('moving by word', () => {
    function walk(
        spec: string,
        steps: (-1 | 1)[],
        extend = false,
        language = 'en-US',
    ): string[] {
        const { markup, position } = parseMarkupWithCaret(spec);
        const source = markupToSource(markup);
        let caret = new Caret(
            source,
            typeof position === 'number'
                ? position + 1
                : [position[0] + 1, position[1] + 1],
            undefined,
            undefined,
        );
        return steps.map((direction) => {
            const result = moveByWord(caret, direction, extend, language);
            if (result === undefined) return 'REFUSED';
            caret = result[1];
            return render(result[0], caret);
        });
    }

    test('forward lands on the end of each word, skipping punctuation', () => {
        expect(walk('|Welcome to Wordplay.', [1, 1, 1, 1])).toEqual([
            'Welcome| to Wordplay.',
            'Welcome to| Wordplay.',
            'Welcome to Wordplay|.',
            // No word left: the edge, so the key is never silently inert.
            'Welcome to Wordplay.|',
        ]);
    });

    test('backward lands on the start of each word', () => {
        expect(walk('Welcome to Wordplay.|', [-1, -1, -1, -1])).toEqual([
            'Welcome to |Wordplay.',
            'Welcome |to Wordplay.',
            '|Welcome to Wordplay.',
            '|Welcome to Wordplay.',
        ]);
    });

    test('shift extends by word and keeps the anchor', () => {
        expect(walk('Welcome |to Wordplay.', [1, 1], true)).toEqual([
            'Welcome [to] Wordplay.',
            'Welcome [to Wordplay].',
        ]);
    });

    test('markup delimiters do not stop word motion', () => {
        // The `*` are separate tokens, but a word is a word across them.
        expect(walk('|A *bold* word', [1, 1, 1])).toEqual([
            'A| *bold* word',
            'A *bold|* word',
            'A *bold* word|',
        ]);
    });

    test('it segments a script that marks no word boundary with a space', () => {
        // Japanese writes no spaces, so a space-scanning implementation would
        // move to the end of the whole line in one press.
        const stops = walk('|日本語を勉強します', [1, 1], false, 'ja-JP');
        expect(stops[0]).not.toBe('日本語を勉強します|');
        expect(stops[0]).toMatch(/^日本語?\|/u);
    });

    test('motion never leaves the markup for the wrapper', () => {
        expect(walk('|Hi', [-1])).toEqual(['|Hi']);
        expect(walk('Hi|', [1])).toEqual(['Hi|']);
    });
});

describe('the word and paragraph a pointer lands in', () => {
    function spans(markup: string, at: number) {
        const source = markupToSource(markup);
        // Positions in the source include the leading `¶`.
        return {
            word: wordAt(source, at + 1, 'en-US')?.map((n) => n - 1),
            paragraph: paragraphAt(source, at + 1).map((n) => n - 1),
        };
    }

    test('a double-click inside a word selects that word', () => {
        // "company" occupies 6..13 of "We are company here".
        const { word } = spans('We are company here', 9);
        expect(word).toEqual([7, 14]);
    });

    test('a triple-click selects the line, not the whole document', () => {
        const { paragraph } = spans('first line\n\nsecond line', 15);
        expect(paragraph).toEqual([12, 23]);
    });

    test('a paragraph at the document edges stays inside the markup', () => {
        const { paragraph } = spans('only', 0);
        expect(paragraph).toEqual([0, 4]);
    });

    test('a click in whitespace selects no word', () => {
        expect(spans('a  b', 2).word).toBeUndefined();
    });
});

describe('finding the example a caret is next to', () => {
    function at(markup: string, position: number) {
        const source = markupToSource(markup);
        const caret = new Caret(source, position + 1, undefined, undefined);
        return enclosingExample(caret) !== undefined;
    }

    test('inside the example', () => {
        expect(at('see \\1 + 1\\ here', 7)).toBe(true);
    });

    test('immediately after the closing delimiter, where the ⭐ renders', () => {
        // Regression: `getTokenAt` matches `position < index + length`, so this
        // resolved to the prose after the example and the annotation commands
        // went inactive at the one position they most obviously apply to.
        const markup = 'see \\1 + 1\\ here';
        expect(at(markup, markup.indexOf('\\', 5) + 1)).toBe(true);
    });

    test('well outside the example', () => {
        expect(at('see \\1 + 1\\ here', 1)).toBe(false);
        expect(at('see \\1 + 1\\ here', 15)).toBe(false);
    });
});

describe('making a web link', () => {
    function link(spec: string): string {
        const { markup, position } = parseMarkupWithCaret(spec);
        const source = markupToSource(markup);
        const caret = new Caret(
            source,
            typeof position === 'number'
                ? position + 1
                : [position[0] + 1, position[1] + 1],
            undefined,
            undefined,
        );
        const result = insertWebLink(caret);
        return result === undefined ? 'REFUSED' : render(result[0], result[1]);
    }

    test('a selection becomes the description, with the URL selected', () => {
        expect(link('read [the docs] now')).toBe(
            'read <the docs@[https://example.com]> now',
        );
    });

    test('the link it makes actually parses as a link', () => {
        // The whole point of the placeholder. A link's URL is a `Sym.URL` token,
        // whose pattern needs `://` and a character after it, so `<docs@>` is not
        // a link — it is prose that renders its own angle brackets, and typing
        // into it makes `@h` lex as a concept reference.
        const source = markupToSource(
            'read <the docs@https://example.com> now',
        );
        const links = source
            .nodes()
            .filter((n) => n.constructor.name === 'WebLink');
        expect(links.length).toBe(1);
        expect(
            markupToSource('read <the docs@> now')
                .nodes()
                .filter((n) => n.constructor.name === 'WebLink').length,
        ).toBe(0);
    });

    test('with no selection the caret goes to the description, which is missing', () => {
        expect(link('read | now')).toBe('read <|@https://example.com> now');
    });
});
