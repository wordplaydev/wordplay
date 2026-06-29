import { describe, expect, test } from 'vitest';
import { parseBatchArgs, resolveLocales, runPool } from './batch';

describe('parseBatchArgs', () => {
    test('gates to override/translate, rejecting other commands', () => {
        expect(typeof parseBatchArgs(['verify'])).toBe('string');
        expect(typeof parseBatchArgs(['fix'])).toBe('string');
        expect(typeof parseBatchArgs(['ci'])).toBe('string');
        expect(typeof parseBatchArgs([])).toBe('string');
    });

    test('parses a command with the default job count', () => {
        expect(parseBatchArgs(['override'])).toEqual({
            command: 'override',
            jobs: 4,
            locales: [],
            flags: [],
        });
    });

    test('parses --jobs and explicit locales', () => {
        expect(
            parseBatchArgs(['translate', '--jobs', '2', 'ja-JP', 'ko-KR']),
        ).toEqual({
            command: 'translate',
            jobs: 2,
            locales: ['ja-JP', 'ko-KR'],
            flags: [],
        });
    });

    test('accepts --jobs=N form', () => {
        expect(parseBatchArgs(['override', '--jobs=3'])).toEqual({
            command: 'override',
            jobs: 3,
            locales: [],
            flags: [],
        });
    });

    test('separates category flags from locales and forwards them', () => {
        expect(
            parseBatchArgs([
                'override',
                '--jobs',
                '2',
                'ja-JP',
                '-quick',
                '-emoji',
            ]),
        ).toEqual({
            command: 'override',
            jobs: 2,
            locales: ['ja-JP'],
            flags: ['-quick', '-emoji'],
        });
    });

    test('rejects invalid category flags (mixing + and -)', () => {
        expect(
            typeof parseBatchArgs(['translate', '+howto', '-emoji']),
        ).toBe('string');
    });

    test('rejects a non-positive or non-numeric --jobs', () => {
        expect(typeof parseBatchArgs(['override', '--jobs', '0'])).toBe(
            'string',
        );
        expect(typeof parseBatchArgs(['override', '--jobs', 'x'])).toBe(
            'string',
        );
        expect(typeof parseBatchArgs(['override', '--jobs'])).toBe('string');
    });

    test('honors the provided default job count', () => {
        expect(parseBatchArgs(['override'], 8)).toEqual({
            command: 'override',
            jobs: 8,
            locales: [],
            flags: [],
        });
    });
});

describe('resolveLocales', () => {
    test('uses the explicit list when given', () => {
        expect(resolveLocales(['ja-JP'], ['en-US', 'ja-JP', 'ko-KR'])).toEqual([
            'ja-JP',
        ]);
    });

    test('defaults to all directories except en-US', () => {
        expect(resolveLocales([], ['en-US', 'ja-JP', 'ko-KR'])).toEqual([
            'ja-JP',
            'ko-KR',
        ]);
    });
});

describe('runPool', () => {
    test('runs every item and preserves input order', async () => {
        const out = await runPool([1, 2, 3, 4, 5], 2, async (n) => n * 2);
        expect(out).toEqual([2, 4, 6, 8, 10]);
    });

    test('never exceeds the concurrency limit', async () => {
        let active = 0;
        let maxActive = 0;
        await runPool([1, 2, 3, 4, 5, 6, 7], 3, async () => {
            active++;
            maxActive = Math.max(maxActive, active);
            await new Promise((r) => setTimeout(r, 5));
            active--;
        });
        expect(maxActive).toBeLessThanOrEqual(3);
    });

    test('handles empty input and jobs greater than item count', async () => {
        expect(await runPool([], 4, async (n: number) => n)).toEqual([]);
        expect(await runPool([1], 4, async (n) => n)).toEqual([1]);
    });
});
