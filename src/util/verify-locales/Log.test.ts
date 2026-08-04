import { describe, expect, test, vi } from 'vitest';
import Log, {
    collectingLog,
    resolveColor,
    resolveSymbols,
    stripAnsi,
} from '@util/verify-locales/Log';

/** A logger whose `exit` is a spy instead of ending the process. */
function exitingLog(failOnBad: boolean) {
    const exit = vi.fn(() => undefined as never);
    const lines: string[] = [];
    return {
        exit,
        lines,
        log: new Log(failOnBad, {
            color: false,
            exit,
            sink: (line) => lines.push(line),
        }),
    };
}

describe('kinds', () => {
    test('each kind renders with its own symbol', () => {
        const { log, lines } = collectingLog();
        // `scope` is covered below — its header is deferred until something
        // logs under it, so it can't be listed alongside the eager kinds.
        log.say('say');
        log.pending('pending');
        log.good('good');
        log.warning('warning');
        log.bad('bad');
        expect(lines).toEqual([
            '· say',
            '… pending',
            '✓ good',
            '! warning',
            '✗ bad',
        ]);
    });

    test('a multi-line message hangs under the message, not the symbol', () => {
        const { log, lines } = collectingLog();
        log.bad('first\nsecond');
        expect(lines).toEqual(['✗ first', '  second']);
    });
});

describe('depth', () => {
    test('nests two spaces per level', () => {
        const { log, lines } = collectingLog();
        log.scope('A').scope('B').say('c');
        expect(lines).toEqual(['▸ A', '  ▸ B', '    · c']);
    });

    test('a child cannot change its parent depth', () => {
        const { log, lines } = collectingLog();
        const child = log.scope('A');
        child.scope('B').say('deep');
        log.say('back at the root');
        expect(lines.at(-1)).toBe('· back at the root');
    });

    test('detail attaches by logging on what a message returned', () => {
        const { log, lines } = collectingLog();
        log.bad('header').bad('detail');
        expect(lines).toEqual(['✗ header', '  ✗ detail']);
    });

    test('indent() adds a level with no header', () => {
        const { log, lines } = collectingLog();
        log.indent().say('detail');
        expect(lines).toEqual(['  · detail']);
    });
});

// A unit of work that reported nothing shouldn't print a header with nothing
// under it — 30 locales × a few silent checks is pages of noise otherwise.
describe('scopes only print when used', () => {
    test('an unused scope stays silent', () => {
        const { log, lines } = collectingLog();
        log.scope('How-tos');
        log.scope('Date/time').good('fine');
        expect(lines).toEqual(['▸ Date/time', '  ✓ fine']);
    });

    test('a header prints once, however many lines follow', () => {
        const { log, lines } = collectingLog();
        const scope = log.scope('Structure');
        scope.bad('one');
        scope.bad('two');
        expect(lines).toEqual(['▸ Structure', '  ✗ one', '  ✗ two']);
    });

    test('a nested scope prints its ancestors first, in order', () => {
        const { log, lines } = collectingLog();
        const inner = log.scope('outer').scope('inner');
        inner.say('leaf');
        expect(lines).toEqual(['▸ outer', '  ▸ inner', '    · leaf']);
    });

    test('an ancestor prints only once across two children', () => {
        const { log, lines } = collectingLog();
        const outer = log.scope('outer');
        outer.scope('a').say('one');
        outer.scope('b').say('two');
        expect(lines).toEqual([
            '▸ outer',
            '  ▸ a',
            '    · one',
            '  ▸ b',
            '    · two',
        ]);
    });

    test('a silent scope does not indent a later sibling', () => {
        const { log, lines } = collectingLog();
        log.scope('silent').scope('also silent');
        log.good('done');
        expect(lines).toEqual(['✓ done']);
    });
});

// errorCount drives start.ts's process exit code, which is the CI gate for
// `npm run locales`, so it is the one behavior no refactor may drift.
describe('errorCount', () => {
    test('only bad() and exit() count', () => {
        const { log } = collectingLog();
        log.scope('a');
        log.say('b');
        log.pending('c');
        log.good('d');
        log.warning('e');
        expect(log.errorCount).toBe(0);
        log.bad('f');
        log.bad('g');
        expect(log.errorCount).toBe(2);
    });

    test('an error at any depth counts toward the root', () => {
        const { log } = collectingLog();
        log.scope('a').scope('b').bad('deep');
        expect(log.errorCount).toBe(1);
    });

    test('failOnBad exits once, on the first error', () => {
        const { log, exit } = exitingLog(true);
        log.bad('first');
        expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    });

    test('exit() prints one line, counts, and exits non-zero', () => {
        const { log, lines, exit } = exitingLog(false);
        log.exit('fatal');
        expect(lines).toEqual(['✗ fatal']);
        expect(log.errorCount).toBe(1);
        expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    });
});

describe('color', () => {
    test('paints the symbol together with the message', () => {
        const { log, lines } = collectingLog(false, { color: true });
        log.bad('nope');
        // The escape opens before the symbol, so the whole line reads as one
        // thing rather than an uncolored mark next to colored text.
        expect(lines[0].indexOf('\u001B[')).toBe(0);
        expect(stripAnsi(lines[0])).toBe('✗ nope');
    });

    test('emits no escapes when color is off', () => {
        const { log, lines } = collectingLog(false, { color: false });
        log.good('yes');
        expect(lines[0]).not.toContain('\u001B');
    });

    // Red/green is the pair deuteranopia and protanopia collapse (~8% of men),
    // so success must never be green while failure is red. Pinning the codes
    // here because "make it green" is the obvious edit for someone who doesn't
    // know why it isn't.
    test('uses a colorblind-safe palette \u2014 cyan success, never green', () => {
        const { log, lines } = collectingLog(false, { color: true });
        log.good('ok');
        log.warning('hmm');
        log.bad('nope');
        const [good, warning, bad] = lines;
        expect(good).toContain('\u001B[36m'); // cyan
        expect(warning).toContain('\u001B[33m'); // yellow
        expect(bad).toContain('\u001B[31m'); // red
        // Bold widens the lightness gap from yellow, since protanopes see red
        // darkened toward brown and shouldn't have to rely on hue alone.
        expect(bad).toContain('\u001B[1m');
        for (const line of lines) expect(line).not.toContain('\u001B[32m');
    });
});

describe('resolveColor', () => {
    test('NO_COLOR beats FORCE_COLOR', () => {
        expect(resolveColor({ NO_COLOR: '1', FORCE_COLOR: '1' }, true)).toBe(
            false,
        );
    });

    test('an empty NO_COLOR is not set', () => {
        expect(resolveColor({ NO_COLOR: '' }, true)).toBe(true);
    });

    test('FORCE_COLOR overrides a non-TTY in both directions', () => {
        expect(resolveColor({ FORCE_COLOR: '1' }, false)).toBe(true);
        expect(resolveColor({ FORCE_COLOR: '0' }, true)).toBe(false);
        expect(resolveColor({ FORCE_COLOR: 'false' }, true)).toBe(false);
    });

    test('a TTY gets color, a bare pipe does not', () => {
        expect(resolveColor({}, true)).toBe(true);
        expect(resolveColor({}, false)).toBe(false);
    });

    test('CI gets color despite not being a TTY', () => {
        expect(resolveColor({ CI: 'true' }, false)).toBe(true);
    });
});

describe('resolveSymbols', () => {
    test('legacy Windows consoles fall back to ASCII', () => {
        expect(resolveSymbols('win32', {}).good).toBe('v');
        expect(resolveSymbols('win32', { WT_SESSION: 'x' }).good).toBe('✓');
        expect(resolveSymbols('darwin', {}).good).toBe('✓');
    });

    test('a custom symbol set is used verbatim', () => {
        const symbols = resolveSymbols('win32', {});
        const { log, lines } = collectingLog(false, { symbols });
        log.bad('nope');
        expect(lines).toEqual(['x nope']);
    });
});

describe('stripAnsi', () => {
    test('removes SGR sequences and leaves text alone', () => {
        expect(stripAnsi('\u001B[31m✗ nope\u001B[39m')).toBe('✗ nope');
        expect(stripAnsi('plain')).toBe('plain');
    });
});
