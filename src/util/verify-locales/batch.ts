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

type LocaleResult = { locale: string; code: number; ms: number };

/** Prefix each complete line of a child's output with its locale so concurrent
 *  progress streams stay readable. Buffers partial lines across data chunks. */
function linePrefixer(locale: string): (data: Buffer) => void {
    let buffer = '';
    return (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) process.stdout.write(`[${locale}] ${line}\n`);
    };
}

/** Run one locale as a child `start.ts` process, streaming prefixed output and
 *  resolving with its exit code (never rejecting, so one failure doesn't abort
 *  the pool). Inherits env (WORDPLAY_TRANSLATOR, ANTHROPIC_API_KEY). */
function runLocale(
    command: BatchCommand,
    locale: string,
    flags: string[],
): Promise<LocaleResult> {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const done = (code: number) =>
            resolve({ locale, code, ms: Date.now() - startedAt });
        const child = spawn(
            'npx',
            [
                'tsx',
                'src/util/verify-locales/start.ts',
                command,
                locale,
                ...flags,
            ],
            { env: process.env },
        );
        child.stdout.on('data', linePrefixer(locale));
        child.stderr.on('data', linePrefixer(locale));
        child.on('close', (code) => done(code ?? 1));
        child.on('error', (error) => {
            process.stdout.write(`[${locale}] failed to start: ${error}\n`);
            done(1);
        });
    });
}

async function main(): Promise<void> {
    const parsed = parseBatchArgs(
        process.argv.slice(2),
        Number(process.env.JOBS) || DEFAULT_JOBS,
    );
    if (typeof parsed === 'string') {
        console.error(parsed);
        process.exit(1);
    }

    const allDirs = fs
        .readdirSync(path.join('static', 'locales'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    const locales = resolveLocales(parsed.locales, allDirs);
    if (locales.length === 0) {
        console.error('No locales to process.');
        process.exit(1);
    }

    console.log(
        `Batch ${parsed.command}: ${locales.length} locale(s), ${parsed.jobs} at a time${parsed.flags.length > 0 ? ` [${parsed.flags.join(' ')}]` : ''} → ${locales.join(', ')}`,
    );
    const startedAt = Date.now();
    const results = await runPool(locales, parsed.jobs, (locale) =>
        runLocale(parsed.command, locale, parsed.flags),
    );

    const failed = results.filter((r) => r.code !== 0);
    console.log('\n=== Batch summary ===');
    for (const r of results)
        console.log(
            `  ${r.code === 0 ? '✓' : '✗'} ${r.locale} (${Math.round(r.ms / 1000)}s)`,
        );
    console.log(
        `Done in ${Math.round((Date.now() - startedAt) / 1000)}s — ${results.length - failed.length} ok, ${failed.length} failed.`,
    );
    process.exit(failed.length > 0 ? 1 : 0);
}

// Only run when invoked directly, so importing the helpers (e.g. in tests) never
// spawns processes.
if (process.argv[1]?.endsWith('batch.ts'))
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
