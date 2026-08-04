import { describe, expect, test } from 'vitest';
import {
    boardLines,
    formatBlock,
    makeLineCollector,
    parseBatchArgs,
    resolveLocales,
    runPool,
    truncate,
} from './batch';
import { resolveSymbols, stripAnsi } from '@util/verify-locales/Log';

const Unicode = resolveSymbols('darwin', {});
const Ascii = resolveSymbols('win32', {});

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
        expect(typeof parseBatchArgs(['translate', '+howto', '-emoji'])).toBe(
            'string',
        );
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

describe('makeLineCollector', () => {
    test('joins a line split across two writes', () => {
        const lines: string[] = [];
        const c = makeLineCollector((l) => lines.push(l));
        c.write('hel');
        c.write('lo\nworld\n');
        expect(lines).toEqual(['hello', 'world']);
    });

    // The old streaming prefixer dropped a child's last line when it arrived
    // without a trailing newline, which is exactly where a fatal ends up.
    test('flush emits a trailing line with no newline', () => {
        const lines: string[] = [];
        const c = makeLineCollector((l) => lines.push(l));
        c.write('done');
        expect(lines).toEqual([]);
        c.flush();
        expect(lines).toEqual(['done']);
    });

    test('flush is a no-op when nothing is buffered', () => {
        const lines: string[] = [];
        const c = makeLineCollector((l) => lines.push(l));
        c.write('a\n');
        c.flush();
        c.flush();
        expect(lines).toEqual(['a']);
    });
});

describe('formatBlock', () => {
    test('titles the rule, indents the body, and ends with a verdict', () => {
        const block = formatBlock(
            { locale: 'ja-JP', code: 0, ms: 94_000 },
            ['▸ Checking ja-JP', '  ✓ done'],
            Unicode,
            30,
        );
        expect(block[0]).toContain('ja-JP');
        expect(block[0]).toHaveLength(30);
        expect(block.slice(1, 3)).toEqual(['  ▸ Checking ja-JP', '    ✓ done']);
        expect(block.at(-2)).toBe('✓ ja-JP finished in 94s');
    });

    test('a failure reports its exit code', () => {
        const block = formatBlock(
            { locale: 'ko-KR', code: 2, ms: 1000 },
            [],
            Unicode,
        );
        expect(block.at(-2)).toBe('✗ ko-KR failed (exit 2) after 1s');
    });

    test('ASCII symbols get an ASCII rule', () => {
        const block = formatBlock(
            { locale: 'ja-JP', code: 0, ms: 0 },
            [],
            Ascii,
        );
        expect(block[0].startsWith('-- ja-JP ')).toBe(true);
        expect(block.at(-2)).toBe('v ja-JP finished in 0s');
    });
});

describe('boardLines', () => {
    test('one line per running locale, then a counter', () => {
        const lines = boardLines(
            [
                { locale: 'ja-JP', latest: '… localizing examples' },
                { locale: 'zh-CN', latest: '▸ How-tos' },
            ],
            3,
            5,
            102_000,
            80,
        );
        expect(lines).toHaveLength(3);
        expect(lines[0]).toBe('ja-JP  … localizing examples');
        expect(lines.at(-1)).toBe('3 done · 2 running · 5 queued · 102s');
    });

    test('pads locale names to a common column', () => {
        const lines = boardLines(
            [
                { locale: 'ja-JP', latest: 'a' },
                { locale: 'ta-IN-LK-SG', latest: 'b' },
            ],
            0,
            0,
            0,
            80,
        );
        expect(lines[0]).toBe('ja-JP        a');
        expect(lines[1]).toBe('ta-IN-LK-SG  b');
    });

    test('truncates a line wider than the terminal', () => {
        const lines = boardLines(
            [{ locale: 'ja-JP', latest: 'x'.repeat(200) }],
            0,
            0,
            0,
            40,
        );
        expect(stripAnsi(lines[0]).length).toBeLessThanOrEqual(39);
    });
});

describe('truncate', () => {
    // The board measures visible width; counting escape bytes would cut a
    // colored line short and leave color bleeding into the rest of the frame.
    test('does not count ANSI escapes toward the width', () => {
        const colored = '\u001B[31m' + 'x'.repeat(50) + '\u001B[39m';
        const cut = truncate(colored, 20);
        expect(stripAnsi(cut).length).toBeLessThanOrEqual(20);
        expect(cut.endsWith('\u001B[0m')).toBe(true);
    });

    test('leaves a line that already fits untouched', () => {
        expect(truncate('short', 20)).toBe('short');
        const colored = '\u001B[31mshort\u001B[39m';
        expect(truncate(colored, 20)).toBe(colored);
    });

    test('a zero or negative width yields nothing', () => {
        expect(truncate('anything', 0)).toBe('');
        expect(truncate('anything', -5)).toBe('');
    });
});
