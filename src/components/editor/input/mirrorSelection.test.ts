import {
    caretFieldSelection,
    shouldEchoNatively,
} from '@components/editor/input/mirrorSelection';
import Caret from '@edit/caret/Caret';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

/**
 * The grapheme→UTF-16 conversion behind the hidden mirror (#1329). It was inline
 * in Editor.svelte and so never directly tested; the failure it prevents is silent
 * — the field's caret lands inside a surrogate pair and the screen reader's echo
 * goes wrong from that point on.
 */
describe('caretFieldSelection', () => {
    test('mirrors the source code', () => {
        const source = new Source('t', '1 + 1');
        const caret = new Caret(source, 0, undefined, undefined);
        expect(caretFieldSelection(caret).text).toBe('1 + 1');
    });

    test('a collapsed caret collapses the selection', () => {
        const source = new Source('t', '1 + 1');
        const caret = new Caret(source, 3, undefined, undefined);
        const { low, high } = caretFieldSelection(caret);
        expect([low, high]).toEqual([3, 3]);
    });

    test('a range selects, ordered low to high', () => {
        const source = new Source('t', '1 + 1');
        // Anchor after focus: the field needs them ordered.
        const caret = new Caret(source, [4, 1], undefined, undefined);
        const { low, high } = caretFieldSelection(caret);
        expect([low, high]).toEqual([1, 4]);
    });

    test.each([
        // One emoji is one grapheme but two UTF-16 code units, so a caret after it
        // must report 2, not 1. Reporting 1 puts the field's caret mid-surrogate.
        ["'😀'", 2, 3],
        ["'😀😀'", 3, 5],
        // A ZWJ sequence is one grapheme and many code units.
        ["'👨‍👩‍👦'", 2, 9],
    ])('%s: grapheme %i converts to code unit %i', (code, graphemes, units) => {
        const source = new Source('t', code);
        const caret = new Caret(source, graphemes, undefined, undefined);
        expect(caretFieldSelection(caret).low).toBe(units);
    });

    test('offsets index the mirrored text exactly', () => {
        // The contract the conversion exists to keep: slicing the mirrored value
        // by the returned offsets must give the text the caret spans.
        const source = new Source('t', "'😀ab'");
        // Graphemes: ' 😀 a b ' — so [1,3] spans the emoji and the `a`, which is
        // code units [1,4). An unconverted [1,3] would slice mid-surrogate.
        const caret = new Caret(source, [1, 3], undefined, undefined);
        const { text, low, high } = caretFieldSelection(caret);
        expect(text.slice(low, high)).toBe('😀a');
    });
});

/**
 * The #1248 echo rule, shared by both editors. It was an inline expression in
 * each, duplicated character for character; the failure it guards against is
 * silent (a screen reader stops speaking typed characters, or speaks each one
 * twice), so it is worth pinning where a browser isn't needed.
 */
describe('shouldEchoNatively', () => {
    const key = (
        k: string,
        modifiers: Partial<
            Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>
        > = {},
    ) =>
        ({
            key: k,
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            shiftKey: false,
            ...modifiers,
        }) as KeyboardEvent;

    test.each(['a', 'Z', '1', '*', '¶'])(
        'a plain character (%s) echoes',
        (k) => {
            expect(shouldEchoNatively(key(k), true)).toBe(true);
        },
    );

    // A character outside the BMP has `key.length === 2`, so it takes the command
    // path rather than the native echo. That is the shipped behavior and it is
    // fine in practice: an emoji arrives by composition or paste, neither of
    // which is a keydown, and both have their own echo path.
    test('an astral character does not take the native echo path', () => {
        expect(shouldEchoNatively(key('😀'), true)).toBe(false);
    });

    test.each(['Enter', 'Backspace', 'Delete'])(
        '%s echoes at a plain text position',
        (k) => {
            expect(shouldEchoNatively(key(k), true)).toBe(true);
        },
    );

    // A node or range operation does more than the naive field edit would, and
    // its feedback is already paced, so it keeps preventDefault.
    test.each(['Enter', 'Backspace', 'Delete'])(
        '%s does not echo when the caret is a node or range',
        (k) => {
            expect(shouldEchoNatively(key(k), false)).toBe(false);
        },
    );

    test.each(['Shift'])('%s+Backspace does not echo', () => {
        expect(
            shouldEchoNatively(key('Backspace', { shiftKey: true }), true),
        ).toBe(false);
    });

    // A chord is a command, and letting the browser also edit the field would
    // apply the edit twice.
    test.each([
        ['control', { ctrlKey: true }],
        ['meta', { metaKey: true }],
        ['alt', { altKey: true }],
    ] as const)('a %s chord does not echo', (_, modifiers) => {
        expect(shouldEchoNatively(key('a', modifiers), true)).toBe(false);
    });

    test('a named key that is not an edit does not echo', () => {
        expect(shouldEchoNatively(key('ArrowLeft'), true)).toBe(false);
        expect(shouldEchoNatively(key('Escape'), true)).toBe(false);
    });
});
