/**
 * Parallel-batch runner for locale translation. Spawns one `start.ts <command>
 * <locale>` child process per locale, a bounded number at a time, to parallelize
 * the otherwise-serial all-locales sweep. Each child is a fully self-scoped
 * single-locale run (start.ts only loads/writes its own locale), so there's no
 * shared state and one locale failing can't take down the others.
 *
 * Gated to translating only — `override` / `translate`, never verify/fix/ci.
 *
 * Usage:
 *   npx tsx src/util/verify-locales/batch.ts override                 # all locales, 4 at a time
 *   npx tsx src/util/verify-locales/batch.ts override --jobs 2 ja-JP ko-KR
 *   JOBS=6 npx tsx src/util/verify-locales/batch.ts translate
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { parseCategorySelection } from '@util/verify-locales/contentCategories';
import Log, {
    resolveColor,
    resolveSymbols,
    stripAnsi,
    type Symbols,
} from '@util/verify-locales/Log';

/** Commands safe to batch — only ones that translate (per-locale, independent).
 *  verify/fix/ci do cross-locale work and stay on the serial `start.ts`. */
const BATCH_COMMANDS = ['override', 'translate'] as const;
type BatchCommand = (typeof BATCH_COMMANDS)[number];

const DEFAULT_JOBS = 4;

export type BatchArgs = {
    command: BatchCommand;
    jobs: number;
    /** Explicit locales to run; empty means "all locales except en-US". */
    locales: string[];
    /** Content-category `+/-` flags to forward verbatim to each child run. */
    flags: string[];
};

function isBatchCommand(value: string | undefined): value is BatchCommand {
    return value === 'override' || value === 'translate';
}

/** Parse CLI args (everything after the script path) into a gated batch command,
 *  concurrency, and explicit locale list. Returns an error message string for bad
 *  input instead of throwing, so the caller can print usage and exit. */
export function parseBatchArgs(
    argv: string[],
    defaultJobs: number = DEFAULT_JOBS,
): BatchArgs | string {
    const command = argv[0];
    if (!isBatchCommand(command))
        return `Batch translation only supports "override" or "translate" (got "${command ?? ''}"). Use start.ts directly for verify/fix/ci.`;

    let jobs = defaultJobs;
    const locales: string[] = [];
    const flags: string[] = [];
    for (let i = 1; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--jobs' || arg.startsWith('--jobs=')) {
            const raw =
                arg === '--jobs' ? argv[++i] : arg.slice('--jobs='.length);
            const n = Number(raw);
            if (!Number.isInteger(n) || n < 1)
                return `--jobs needs a positive integer (got "${raw ?? ''}").`;
            jobs = n;
        } else if (arg.startsWith('+') || arg.startsWith('-')) {
            // A content-category flag (locale names never start with +/-).
            flags.push(arg);
        } else {
            locales.push(arg);
        }
    }

    // Validate the category flags up front (same parser the children use), so a
    // typo fails the whole batch before any child spawns.
    const selection = parseCategorySelection(flags);
    if (typeof selection === 'string') return selection;

    return { command, jobs, locales, flags };
}

/** The locales to process: the explicit list if any, else every locale directory
 *  except en-US (the untranslated source). */
export function resolveLocales(
    explicit: string[],
    allDirs: string[],
): string[] {
    return explicit.length > 0
        ? explicit
        : allDirs.filter((dir) => dir !== 'en-US');
}

/** Run `worker` over `items` with at most `jobs` running concurrently, returning
 *  results in input order. A bounded pool: each runner pulls the next index until
 *  the list is exhausted. */
export async function runPool<T, R>(
    items: T[],
    jobs: number,
    worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    const results: R[] = new Array<R>(items.length);
    let next = 0;
    const runner = async (): Promise<void> => {
        while (next < items.length) {
            const index = next++;
            results[index] = await worker(items[index], index);
        }
    };
    await Promise.all(
        Array.from({ length: Math.max(1, Math.min(jobs, items.length)) }, () =>
            runner(),
        ),
    );
    return results;
}

export type LocaleResult = { locale: string; code: number; ms: number };

/** Split a child's byte stream into complete lines across chunk boundaries.
 *  `flush()` emits a trailing line that never got its newline — which the old
 *  streaming prefixer dropped silently at process close. */
export function makeLineCollector(onLine: (line: string) => void): {
    write: (data: Buffer | string) => void;
    flush: () => void;
} {
    let buffer = '';
    return {
        write(data) {
            buffer += data.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) onLine(line);
        },
        flush() {
            if (buffer.length > 0) {
                onLine(buffer);
                buffer = '';
            }
        },
    };
}

/** Cut `text` to `width` visible columns, measuring with ANSI stripped so a
 *  colored line isn't truncated by its escape sequences. Closes any severed
 *  sequence with a reset so color can't bleed into the rest of the board. */
export function truncate(text: string, width: number): string {
    if (width <= 0) return '';
    if (stripAnsi(text).length <= width) return text;
    let visible = 0;
    let out = '';
    for (let i = 0; i < text.length;) {
        const escape = /^\u001B\[[0-9;]*m/.exec(text.slice(i));
        if (escape !== null) {
            out += escape[0];
            i += escape[0].length;
            continue;
        }
        if (visible >= width - 1) break;
        out += text[i];
        visible++;
        i++;
    }
    return out + '…\u001B[0m';
}

const seconds = (ms: number) => `${Math.round(ms / 1000)}s`;

/** One finished locale as a contiguous block: a titled rule, its whole output
 *  indented beneath, and a verdict. Contiguity is the point — it replaces the
 *  per-line `[locale]` prefix that made four concurrent runs unreadable. */
export function formatBlock(
    result: LocaleResult,
    lines: string[],
    symbols: Symbols,
    width = 60,
): string[] {
    const unicode = symbols.good === '✓';
    const rule = unicode ? '─' : '-';
    const title = `${rule}${rule} ${result.locale} `;
    const verdict =
        result.code === 0
            ? `${symbols.good} ${result.locale} finished in ${seconds(result.ms)}`
            : `${symbols.bad} ${result.locale} failed (exit ${result.code}) after ${seconds(result.ms)}`;
    return [
        title + rule.repeat(Math.max(0, width - stripAnsi(title).length)),
        ...lines.map((line) => '  ' + line),
        verdict,
        '',
    ];
}

export type LocaleState = { locale: string; latest: string };

/** The live board: one line per running locale showing its most recent output,
 *  plus a progress counter. Pure, so truncation and the counter are testable. */
export function boardLines(
    running: LocaleState[],
    done: number,
    queued: number,
    elapsedMs: number,
    columns: number,
): string[] {
    const width = Math.max(20, columns - 1);
    const pad = Math.max(0, ...running.map((r) => r.locale.length));
    return [
        ...running.map((r) =>
            truncate(`${r.locale.padEnd(pad)}  ${r.latest}`, width),
        ),
        truncate(
            `${done} done · ${running.length} running · ${queued} queued · ${seconds(elapsedMs)}`,
            width,
        ),
    ];
}

/**
 * Repaints the board in place above the scrollback. Only constructed for a
 * TTY: GitHub Actions renders SGR color but shows cursor-movement codes as
 * literal garbage, so CI gets the plain stream instead.
 */
class StatusBoard {
    private drawn = 0;
    private readonly timer: NodeJS.Timeout;
    private readonly startedAt: number;
    readonly running = new Map<string, LocaleState>();
    done = 0;
    queued = 0;

    constructor(startedAt: number, queued: number) {
        this.startedAt = startedAt;
        this.queued = queued;
        process.stdout.write('\u001B[?25l');
        // The collectors only update state; this paints. Repainting per child
        // chunk flickers and burns CPU on a chatty translate run.
        this.timer = setInterval(() => this.render(), 100);
        this.timer.unref();
    }

    private render(): void {
        const lines = boardLines(
            [...this.running.values()],
            this.done,
            this.queued,
            Date.now() - this.startedAt,
            // `||`, not `??`: a pty that reports 0 columns is as useless as one
            // that reports none, and would truncate every line to the minimum.
            process.stdout.columns || 80,
        );
        // Move up over the previous frame, then clear and rewrite each line.
        // Never a full-screen clear, so finished blocks stay in scrollback.
        let out = this.drawn > 0 ? `\u001B[${this.drawn}A` : '';
        for (const line of lines) out += `\u001B[2K${line}\n`;
        process.stdout.write(out);
        this.drawn = lines.length;
    }

    /** Erase the board so a finished block can be written where it was. Paired
     *  with `resume()` by `write()`, which is the only caller. */
    private erase(): void {
        if (this.drawn > 0)
            process.stdout.write(`\u001B[${this.drawn}A\u001B[0J`);
        this.drawn = 0;
    }

    /** Erase, print, repaint — synchronously, in one call. `process.stdout` to
     *  a TTY is synchronous and Node is single-threaded, so the repaint timer
     *  can't interleave and tear the frame. */
    write(lines: string[]): void {
        this.erase();
        process.stdout.write(lines.join('\n') + '\n');
        this.render();
    }

    stop(): void {
        clearInterval(this.timer);
        this.erase();
        process.stdout.write('\u001B[?25h');
    }
}

/** Run one locale as a child `start.ts` process, buffering its output so the
 *  whole run prints as one contiguous block, and resolving with its exit code
 *  (never rejecting, so one failure doesn't abort the pool). Inherits env
 *  (WORDPLAY_TRANSLATOR, ANTHROPIC_API_KEY). */
function runLocale(
    command: BatchCommand,
    locale: string,
    flags: string[],
    env: NodeJS.ProcessEnv,
    symbols: Symbols,
    board: StatusBoard | undefined,
    emit: (lines: string[]) => void,
): Promise<LocaleResult> {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const buffered: string[] = [];
        const state: LocaleState = { locale, latest: 'starting…' };
        board?.running.set(locale, state);
        if (board === undefined) emit([`${symbols.pending} ${locale} started`]);

        const collector = makeLineCollector((line) => {
            buffered.push(line);
            if (line.trim().length > 0) state.latest = line.trim();
        });
        const done = (code: number) => {
            collector.flush();
            board?.running.delete(locale);
            if (board !== undefined) board.done++;
            const result = { locale, code, ms: Date.now() - startedAt };
            emit(formatBlock(result, buffered, symbols));
            resolve(result);
        };

        const child = spawn(
            'npx',
            [
                'tsx',
                'src/util/verify-locales/start.ts',
                command,
                locale,
                ...flags,
            ],
            // The board owns the terminal, so a child must never be able to
            // block reading stdin.
            { env, stdio: ['ignore', 'pipe', 'pipe'] },
        );
        child.stdout.on('data', collector.write);
        child.stderr.on('data', collector.write);
        child.on('close', (code) => done(code ?? 1));
        child.on('error', (error) => {
            buffered.push(`failed to start: ${error}`);
            done(1);
        });
    });
}

async function main(): Promise<void> {
    // Annotated so TypeScript narrows past `log.exit()`, which returns `never`
    // — control-flow analysis only does that for an explicitly typed receiver.
    const log: Log = new Log(false);
    const symbols = resolveSymbols();
    const parsed = parseBatchArgs(
        process.argv.slice(2),
        Number(process.env.JOBS) || DEFAULT_JOBS,
    );
    if (typeof parsed === 'string') log.exit(parsed);

    const allDirs = fs
        .readdirSync(path.join('static', 'locales'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    const locales = resolveLocales(parsed.locales, allDirs);
    if (locales.length === 0) log.exit('No locales to process.');

    // A child's stdout is a pipe, never a TTY, so it can't decide for itself —
    // push the parent's decision down so both agree and the buffered lines we
    // reprint carry the same palette as everything else.
    const color = resolveColor();
    const env: NodeJS.ProcessEnv = {
        ...process.env,
        ...(color ? { FORCE_COLOR: '1' } : { NO_COLOR: '1' }),
    };

    log.say(
        `Batch ${parsed.command}: ${locales.length} locale(s), ${parsed.jobs} at a time${parsed.flags.length > 0 ? ` [${parsed.flags.join(' ')}]` : ''} → ${locales.join(', ')}`,
    );

    const startedAt = Date.now();
    const board =
        process.stdout.isTTY === true
            ? new StatusBoard(startedAt, locales.length)
            : undefined;
    // The board owns the terminal when it exists, so every write goes through
    // it; otherwise straight to stdout.
    const emit = (lines: string[]) =>
        board !== undefined
            ? board.write(lines)
            : process.stdout.write(lines.join('\n') + '\n');

    // An interrupted run must not leave the cursor hidden in the user's shell.
    const restore = () => board?.stop();
    process.on('exit', restore);
    process.on('SIGINT', () => {
        restore();
        process.exit(130);
    });

    const results = await runPool(locales, parsed.jobs, (locale) => {
        if (board !== undefined) board.queued--;
        return runLocale(
            parsed.command,
            locale,
            parsed.flags,
            env,
            symbols,
            board,
            emit,
        );
    });
    board?.stop();

    const failed = results.filter((r) => r.code !== 0);
    const summary = log.scope('Batch summary');
    for (const r of results)
        if (r.code === 0) summary.good(`${r.locale} (${seconds(r.ms)})`);
        else summary.bad(`${r.locale} (${seconds(r.ms)})`);
    log.say(
        `Done in ${seconds(Date.now() - startedAt)} — ${results.length - failed.length} ok, ${failed.length} failed.`,
    );
    process.exitCode = failed.length > 0 ? 1 : 0;
}

// Only run when invoked directly, so importing the helpers (e.g. in tests) never
// spawns processes.
if (process.argv[1]?.endsWith('batch.ts'))
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
