/**
 * Runs start.ts's per-locale loop across several processes. Each locale's check
 * reads every locale (for `globals`) but writes only its own files, so a `verify`
 * or `fix` run over 31 locales was 31 independent units done one at a time on one
 * core: about four of the job's four and a half minutes in CI.
 *
 * A child is start.ts itself with `WORDPLAY_LOCALES_SHARD=i/n` set: it loads every
 * locale as usual, checks only its share, and leaves the steps that read across
 * locales to the parent. The parent reassembles the output so it reads as one
 * sequential run.
 */
import { spawn } from 'child_process';
import os from 'os';
import { makeLineCollector } from '#util/verify-locales/batch.ts';

/** Names this process's share of the locales, when it is a child. */
export const ShardVariable = 'WORDPLAY_LOCALES_SHARD';
/** The directory a child writes each checked locale to, so the parent's artifact
 *  steps read the text as this run left it (repaired, under `fix`). */
export const ShardOutVariable = 'WORDPLAY_LOCALES_SHARD_OUT';
/** Opens a locale's block in a child's output. Printed with `console.log` rather
 *  than through `Log`, so its format is stable, and never shown. */
export const LocaleBeginMarker = '[locale-begin] ';
/** A child's error count, its last line: under `fix` a child exits 0 whatever it
 *  reported, so the count is the only way the parent can know. */
export const ShardErrorsMarker = '[locale-errors] ';

export type Shard = { index: number; count: number };

/** The shard named by the environment, `undefined` when this isn't a child, or a
 *  description of what is wrong with the value. */
export function parseShard(
    value: string | undefined,
): Shard | undefined | string {
    if (value === undefined || value === '') return undefined;
    const match = /^(\d+)\/(\d+)$/.exec(value);
    const index = Number(match?.[1]);
    const count = Number(match?.[2]);
    if (match === null || count < 1 || index >= count)
        return `${ShardVariable}="${value}" should be "<index>/<count>", with index below count.`;
    return { index, count };
}

/** This shard's locales. Interleaved rather than in runs, so locales finish in
 *  roughly the order they are printed and the parent can print as it goes. */
export function shardLocales<T>(locales: T[], shard: Shard): T[] {
    return locales.filter((_, index) => index % shard.count === shard.index);
}

/** How many children to run: `JOBS`, as batch.ts reads it, or one per core up to
 *  eight, since each child holds every locale in memory. */
export function getJobCount(
    jobs: string | undefined,
    cores = os.availableParallelism(),
): number {
    const requested = Number(jobs);
    return Number.isInteger(requested) && requested >= 1
        ? requested
        : Math.max(1, Math.min(cores, 8));
}

/**
 * Collects the lines of locales checked out of order and emits each locale's block
 * once every locale before it has been emitted. A block is complete when the
 * locale after it begins in the same child, or when that child finishes.
 */
export function makeOrderedEmitter(
    order: string[],
    emit: (line: string) => void,
): {
    /** Add a line for a locale. */
    line: (locale: string, line: string) => void;
    /** Mark a locale's block complete. */
    finish: (locale: string) => void;
    /** Emit whatever is left, in order, returning the locales never finished:
     *  a child that crashed leaves the rest of its share behind. */
    drain: () => string[];
} {
    const lines = new Map<string, string[]>();
    const finished = new Set<string>();
    let next = 0;
    const flush = () => {
        for (; next < order.length; next++) {
            const locale = order[next];
            if (locale === undefined || !finished.has(locale)) return;
            for (const line of lines.get(locale) ?? []) emit(line);
            lines.delete(locale);
        }
    };
    return {
        line(locale, line) {
            const block = lines.get(locale) ?? [];
            lines.set(locale, block);
            block.push(line);
        },
        finish(locale) {
            finished.add(locale);
            flush();
        },
        drain() {
            const missing = order.filter((locale) => !finished.has(locale));
            for (const locale of missing) finished.add(locale);
            flush();
            return missing;
        },
    };
}

export type ShardResult = { code: number; errors: number; stray: string[] };

/**
 * Starts `count` children of start.ts running `command`, routing each locale's
 * lines through `emitter`. Resolves once all have exited, with each child's exit
 * code, its reported error count, and any lines it printed outside a locale (a
 * crash before the first locale, say), which the parent must not lose.
 */
export function runShards(
    command: string,
    count: number,
    env: NodeJS.ProcessEnv,
    emitter: ReturnType<typeof makeOrderedEmitter>,
): Promise<ShardResult[]> {
    return Promise.all(
        Array.from(
            { length: count },
            (_, index) =>
                new Promise<ShardResult>((resolve) => {
                    const result: ShardResult = {
                        code: 0,
                        errors: 0,
                        stray: [],
                    };
                    let current: string | undefined;
                    const collector = makeLineCollector((line) => {
                        if (line.startsWith(LocaleBeginMarker)) {
                            if (current !== undefined) emitter.finish(current);
                            current = line.slice(LocaleBeginMarker.length);
                        } else if (line.startsWith(ShardErrorsMarker))
                            result.errors =
                                Number(line.slice(ShardErrorsMarker.length)) ||
                                0;
                        else if (current !== undefined)
                            emitter.line(current, line);
                        else result.stray.push(line);
                    });
                    const done = (code: number) => {
                        collector.flush();
                        if (current !== undefined) emitter.finish(current);
                        result.code = code;
                        resolve(result);
                    };
                    const child = spawn(
                        'npx',
                        ['tsx', 'src/util/verify-locales/start.ts', command],
                        {
                            env: {
                                ...env,
                                [ShardVariable]: `${index}/${count}`,
                            },
                            stdio: ['ignore', 'pipe', 'pipe'],
                        },
                    );
                    child.stdout.on('data', collector.write);
                    child.stderr.on('data', collector.write);
                    child.on('close', (code) => done(code ?? 1));
                    child.on('error', (error) => {
                        result.stray.push(`failed to start: ${error}`);
                        done(1);
                    });
                }),
        ),
    );
}
