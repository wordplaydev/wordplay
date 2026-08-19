import { describe, expect, test } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
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

    // A timeout is an APIConnectionError subclass, so testing the parent first
    // reported a deadline we set as a network we couldn't reach — which sent
    // two people checking their connection and their API key for hours.
    test('names a client timeout as a timeout, not a network failure', () => {
        const message = describeClaudeError(
            new Anthropic.APIConnectionTimeoutError({ message: 'timed out' }),
        );
        expect(message).toContain('timeout');
        expect(message).not.toContain('check the network');
    });

    test('still names a real connection failure as one', () => {
        const message = describeClaudeError(
            new Anthropic.APIConnectionError({ message: 'no route' }),
        );
        expect(message).toContain('check the network');
    });

    // A spend cap arrives as a 400, so it reads as "bad request" — the one
    // thing it isn't — and it's the only failure that resolves on a date
    // rather than by changing something.
    test('names a spent usage limit rather than calling it a bad request', () => {
        const message = describeClaudeError(
            new Anthropic.BadRequestError(
                400,
                {
                    type: 'error',
                    error: {
                        type: 'invalid_request_error',
                        message:
                            'You have reached your specified API usage limits. You will regain access on 2026-09-01 at 00:00 UTC.',
                    },
                },
                'msg',
                new Headers(),
            ),
        );
        expect(message).toContain('usage limit');
        expect(message).not.toMatch(/^bad request/);
        // The reset date is the actionable part; don't swallow it.
        expect(message).toContain('2026-09-01');
    });

    test('an ordinary 400 is still reported as a bad request', () => {
        const message = describeClaudeError(
            new Anthropic.BadRequestError(
                400,
                {
                    type: 'error',
                    error: { type: 'invalid_request_error', message: 'oops' },
                },
                'msg',
                new Headers(),
            ),
        );
        expect(message).toMatch(/^bad request/);
    });
});
