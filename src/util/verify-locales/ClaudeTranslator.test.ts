import { describe, expect, test } from 'vitest';
import { describeClaudeError, parseTranslations } from './ClaudeTranslator';

describe('parseTranslations', () => {
    test('returns the array when shape and length match', () => {
        expect(
            parseTranslations(JSON.stringify({ translations: ['a', 'b'] }), 2),
        ).toEqual(['a', 'b']);
    });

    test('preserves order', () => {
        expect(
            parseTranslations(
                JSON.stringify({ translations: ['x', 'y', 'z'] }),
                3,
            ),
        ).toEqual(['x', 'y', 'z']);
    });

    test('undefined on length mismatch (so caller keeps source)', () => {
        expect(
            parseTranslations(JSON.stringify({ translations: ['a'] }), 2),
        ).toBeUndefined();
    });

    test('undefined on wrong shape', () => {
        expect(
            parseTranslations(JSON.stringify({ foo: 1 }), 1),
        ).toBeUndefined();
        expect(parseTranslations(JSON.stringify(['a']), 1)).toBeUndefined();
        expect(
            parseTranslations(JSON.stringify({ translations: 'a' }), 1),
        ).toBeUndefined();
        expect(
            parseTranslations(JSON.stringify({ translations: [1, 2] }), 2),
        ).toBeUndefined();
    });

    test('undefined on invalid JSON', () => {
        expect(parseTranslations('not json', 1)).toBeUndefined();
    });
});

describe('describeClaudeError', () => {
    test('stringifies non-API errors with a readable message', () => {
        expect(describeClaudeError('boom')).toBe('boom');
        expect(describeClaudeError(new Error('nope'))).toContain('nope');
    });
});
