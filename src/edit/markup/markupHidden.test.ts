import Caret from '@edit/caret/Caret';
import markupHiddenTokens from '@edit/markup/markupHidden';
import { getMarkup, markupToSource } from '@edit/markup/markupSource';
import { describe, expect, test } from 'vitest';

/** The texts of the tokens prose mode would hide, for markup and a caret position. */
function hiddenIn(markup: string, at?: number): string[] {
    const source = markupToSource(markup);
    const root = getMarkup(source);
    if (root === undefined) throw new Error('expected markup');
    const caret =
        at === undefined
            ? undefined
            : // +1 for the `¶` wrapper.
              new Caret(source, at + 1, undefined, undefined);
    // Sorted: the set is used for membership, so traversal order is not a
    // behavior worth pinning.
    return markupHiddenTokens(root, caret, true)
        .map((t) => t.getText())
        .sort();
}

describe('with the caret away, delimiters are hidden', () => {
    test.each([
        ['a *bold* b', ['*', '*']],
        ['a /italic/ b', ['/', '/']],
        ['a _under_ b', ['_', '_']],
        ['a ~light~ b', ['~', '~']],
        ['a ^extra^ b', ['^', '^']],
        ['a \\1 + 1\\ b', ['\\', '\\']],
    ])('%j hides %j', (markup, expected) => {
        // Caret at the very start, outside every run.
        expect(hiddenIn(markup, 0)).toEqual(expected);
    });

    // A link hides everything but its description, so prose reads as prose. It
    // used to be left to `WebLinkView`, which swapped in an anchor — and an
    // anchor swallows the pointerdown that places the caret, so a link was a hole
    // in the text that could never be entered or edited.
    test('a link hides all but its description', () => {
        expect(hiddenIn('see <Wordplay@https://wordplay.dev> now', 0)).toEqual(
            ['<', '@', 'https://wordplay.dev', '>'].sort(),
        );
    });

    test('a link reveals itself when the caret is inside it', () => {
        // Position 8 is inside the description, so the whole link is editable.
        expect(hiddenIn('see <Wordplay@https://wordplay.dev> now', 8)).toEqual(
            [],
        );
    });

    test('plain prose hides nothing', () => {
        expect(hiddenIn('just words', 0)).toEqual([]);
    });

    test('nested runs are both hidden', () => {
        expect(hiddenIn('a */both/* b', 0)).toEqual(
            ['*', '*', '/', '/'].sort(),
        );
    });
});

describe('the caret reveals the run it is in', () => {
    // This is what makes the syntax learnable in place rather than hidden.
    test('a caret inside a bold run reveals its delimiters', () => {
        // "a *bold* b" — position 4 is inside "bold".
        expect(hiddenIn('a *bold* b', 4)).toEqual([]);
    });

    test('a caret in one run does not reveal another', () => {
        // "*a* and /b/" — position 1 is inside the bold run.
        expect(hiddenIn('*a* and /b/', 1)).toEqual(['/', '/']);
    });

    // A caret at a run's edge counts as inside it: that is where you are when
    // you are about to type into it, which is exactly when the syntax should show.
    test('a caret at a run boundary reveals it', () => {
        expect(hiddenIn('\\1 + 1\\', 0)).toEqual([]);
    });

    test('a caret inside the inner of two nested runs reveals both', () => {
        // Both enclose the caret, so both are revealed.
        expect(hiddenIn('*/both/*', 3)).toEqual([]);
    });

    test('a caret inside an example reveals its delimiters', () => {
        expect(hiddenIn('a \\1 + 1\\ b', 4)).toEqual([]);
    });
});

describe('source mode hides nothing', () => {
    test('every delimiter stays visible', () => {
        const source = markupToSource('a *bold* and \\1 + 1\\ b');
        const root = getMarkup(source);
        if (root === undefined) throw new Error('expected markup');
        const caret = new Caret(source, 1, undefined, undefined);
        expect(markupHiddenTokens(root, caret, false)).toEqual([]);
    });
});

describe('example annotations stay visible', () => {
    // ⭐ and 🪲 say something about the example that no rendering of the code
    // conveys, so hiding them would lose information rather than clutter.
    test('a starred example keeps its star', () => {
        // Position 2 is in the prose before the example, so it is not revealed.
        expect(hiddenIn('a \\1 + 1\\⭐', 1)).toEqual(['\\', '\\']);
    });
});
