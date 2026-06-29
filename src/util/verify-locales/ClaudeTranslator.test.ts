import { describe, expect, test } from 'vitest';
import { describeClaudeError, reconcileTranslations } from './ClaudeTranslator';

/** Build an id-keyed response body from index→text pairs. */
const body = (pairs: [number, string][]) =>
    JSON.stringify({
        translations: pairs.map(([index, text]) => ({ index, text })),
    });

describe('reconcileTranslations', () => {
    test('maps each translation to its echoed index', () => {
        expect(
            reconcileTranslations(
                body([
                    [0, 'a'],
                    [1, 'b'],
                ]),
                2,
            ),
        ).toEqual(['a', 'b']);
    });

    test('reorders by index regardless of array order', () => {
        expect(
            reconcileTranslations(
                body([
                    [2, 'z'],
                    [0, 'x'],
                    [1, 'y'],
                ]),
                3,
            ),
        ).toEqual(['x', 'y', 'z']);
    });

    test('a dropped item leaves that index null, neighbors intact (no split)', () => {
        expect(
            reconcileTranslations(
                body([
                    [0, 'a'],
                    [2, 'c'],
                ]),
                3,
            ),
        ).toEqual(['a', null, 'c']);
    });

    test('ignores out-of-range, duplicate, and non-string entries', () => {
        // Out-of-range 5 ignored; duplicate index 0 keeps the first; index 1 stays null.
        expect(
            reconcileTranslations(
                JSON.stringify({
                    translations: [
                        { index: 0, text: 'a' },
                        { index: 5, text: 'oops' },
                        { index: 0, text: 'dupe' },
                        { index: 2, text: 7 },
                    ],
                }),
                3,
            ),
        ).toEqual(['a', null, null]);
    });

    test('all-null when the response has no usable items', () => {
        expect(reconcileTranslations(body([]), 2)).toEqual([null, null]);
    });

    test('undefined only when wholly unparseable', () => {
        expect(reconcileTranslations('not json', 1)).toBeUndefined();
        expect(
            reconcileTranslations(JSON.stringify({ foo: 1 }), 1),
        ).toBeUndefined();
        expect(
            reconcileTranslations(JSON.stringify({ translations: 'a' }), 1),
        ).toBeUndefined();
    });
});

describe('describeClaudeError', () => {
    test('stringifies non-API errors with a readable message', () => {
        expect(describeClaudeError('boom')).toBe('boom');
        expect(describeClaudeError(new Error('nope'))).toContain('nope');
    });
});
