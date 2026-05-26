import { describe, expect, test } from 'vitest';
import * as Y from 'yjs';
import type { Path } from '@nodes/Root';
import Source from '@nodes/Source';
import { decodeRemoteCaret, encodeRemoteCaret } from './caretEncoding';

/** Narrowing predicate — decodeRemoteCaret can return `Path` *or*
 *  `[number, number]`, and `Array.isArray` alone can't tell them
 *  apart. CLAUDE.md forbids `as` so we inspect element shape. */
function isPath(value: unknown): value is Path {
    if (!Array.isArray(value)) return false;
    for (const item of value) {
        if (typeof item !== 'object' || item === null) return false;
        if (!('type' in item) || !('index' in item)) return false;
        if (typeof item.type !== 'string') return false;
        if (typeof item.index !== 'number') return false;
    }
    return true;
}

/**
 * The caret-encoding helpers are how presence positions stay aligned
 * with their target content as peers edit around them. These tests
 * cover the three published shapes (point / range / node) and the
 * stability properties the editor relies on:
 *
 *   - Point and range positions ride on Yjs RelativePositions, so
 *     they have to shift when content is inserted in front of them.
 *   - Node positions ride on AST Paths and need a nearest-ancestor
 *     fallback when the exact path no longer resolves.
 */

function makeSource(code: string): Source {
    return new Source('main', code);
}

/** Spin up a Y.Doc + Y.Text seeded with the given text, ready to feed
 *  encode/decode. The Y.Text must be attached to a Y.Doc for
 *  RelativePosition resolution to work. */
function ytextFor(initial: string): Y.Text {
    const doc = new Y.Doc();
    const text = doc.getText('main');
    text.insert(0, initial);
    return text;
}

describe('encodeRemoteCaret + decodeRemoteCaret — text point', () => {
    test('round-trips a point position when content is unchanged', () => {
        const yText = ytextFor('hello world');
        const source = makeSource('hello world');
        const encoded = encodeRemoteCaret(yText, source, 5);
        const decoded = decodeRemoteCaret(encoded, yText, source);
        expect(decoded).toBe(5);
    });

    test('shifts forward when content is inserted before the position', () => {
        const yText = ytextFor('hello world');
        const source = makeSource('hello world');
        // Publish a caret at position 5 (between "hello" and " world").
        const encoded = encodeRemoteCaret(yText, source, 5);
        // A peer inserts two characters at the start.
        yText.insert(0, 'AB');
        // The "same" position is now at index 7, not 5. This is the
        // bug RelativePositions exist to fix.
        const decoded = decodeRemoteCaret(encoded, yText, source);
        expect(decoded).toBe(7);
    });

    test('does not shift when content is inserted after the position', () => {
        const yText = ytextFor('hello world');
        const source = makeSource('hello world');
        const encoded = encodeRemoteCaret(yText, source, 5);
        yText.insert(yText.length, ' more');
        const decoded = decodeRemoteCaret(encoded, yText, source);
        expect(decoded).toBe(5);
    });

    test('shifts backward when content is deleted before the position', () => {
        const yText = ytextFor('hello world');
        const source = makeSource('hello world');
        const encoded = encodeRemoteCaret(yText, source, 5);
        // Delete "hel" — three characters before the caret.
        yText.delete(0, 3);
        const decoded = decodeRemoteCaret(encoded, yText, source);
        expect(decoded).toBe(2);
    });

    test('the [1 1 1] case from the spec — caret just before "]"', () => {
        // The repro the user described: their caret sits just before
        // the right bracket in `[1 1 1]` (position 6), and another
        // user types a "2" before the first "1" (insert at position
        // 1). The caret must stay just before "]" — now at index 7 —
        // rather than ending up before the last "1" at index 6.
        const yText = ytextFor('[1 1 1]');
        const source = makeSource('[1 1 1]');
        const encoded = encodeRemoteCaret(yText, source, 6);
        yText.insert(1, '2');
        const decoded = decodeRemoteCaret(encoded, yText, source);
        expect(decoded).toBe(7);
        // Sanity: the character to the right of the new caret index
        // should still be the closing bracket.
        expect(yText.toString()[7]).toBe(']');
    });

    test('null caret round-trips as null', () => {
        const yText = ytextFor('x');
        const source = makeSource('x');
        expect(encodeRemoteCaret(yText, source, null)).toBeNull();
        expect(decodeRemoteCaret(null, yText, source)).toBeNull();
    });
});

describe('encodeRemoteCaret + decodeRemoteCaret — text range', () => {
    test('round-trips an unchanged range', () => {
        const yText = ytextFor('hello world');
        const source = makeSource('hello world');
        const encoded = encodeRemoteCaret(yText, source, [2, 7]);
        const decoded = decodeRemoteCaret(encoded, yText, source);
        expect(decoded).toEqual([2, 7]);
    });

    test('both endpoints shift when content is inserted before them', () => {
        const yText = ytextFor('hello world');
        const source = makeSource('hello world');
        const encoded = encodeRemoteCaret(yText, source, [2, 7]);
        yText.insert(0, 'ABCD');
        const decoded = decodeRemoteCaret(encoded, yText, source);
        expect(decoded).toEqual([6, 11]);
    });

    test('only the trailing endpoint shifts when an insert lands inside the range', () => {
        const yText = ytextFor('hello world');
        const source = makeSource('hello world');
        const encoded = encodeRemoteCaret(yText, source, [2, 7]);
        // Insert at index 4 (inside the range).
        yText.insert(4, '!!');
        const decoded = decodeRemoteCaret(encoded, yText, source);
        // Anchor at 2 (before the insert) stays put; head at 7 shifts by 2.
        expect(decoded).toEqual([2, 9]);
    });
});

describe('encodeRemoteCaret + decodeRemoteCaret — node path', () => {
    test('round-trips a node when the same node still exists', () => {
        const source = makeSource('Phrase("hi")');
        const yText = ytextFor(source.code.toString());
        // Pick any node in the source — Source.expression is the
        // top-level Program AST.
        const node = source.expression;
        const encoded = encodeRemoteCaret(yText, source, node);
        expect(encoded?.kind).toBe('node');
        const decoded = decodeRemoteCaret(encoded, yText, source);
        // The decoded path should resolve to the same node.
        if (isPath(decoded)) {
            expect(source.root.resolvePath(decoded)).toBe(node);
        } else {
            throw new Error(
                `expected a Path-shaped decode, got ${JSON.stringify(decoded)}`,
            );
        }
    });

    test('falls back to the nearest existing ancestor when the path no longer resolves', () => {
        const source = makeSource('Phrase("hi")');
        const yText = ytextFor(source.code.toString());
        // Publish a caret on a deep node...
        const node = source.expression;
        const encoded = encodeRemoteCaret(yText, source, node);
        // ...then decode against a totally different source whose tree
        // doesn't contain the same shape. The nearest-existing-ancestor
        // walk should at least find the source's root (Path []) rather
        // than returning null.
        const otherSource = makeSource('');
        const decoded = decodeRemoteCaret(encoded, yText, otherSource);
        if (!isPath(decoded)) {
            throw new Error(
                `expected a Path-shaped decode, got ${JSON.stringify(decoded)}`,
            );
        }
        // The fallback returns the deepest still-resolvable path,
        // which is at worst the empty path (the root).
        expect(otherSource.root.resolvePath(decoded)).not.toBeUndefined();
    });
});
