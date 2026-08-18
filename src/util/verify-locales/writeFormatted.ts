import fs from 'fs';
import * as prettier from 'prettier';
import type Log from '@util/verify-locales/Log';

/** The Prettier parser for a file extension, or undefined if Prettier has no
 *  parser for it (e.g. the custom how-to text format) — those are written raw. */
function parserFor(filePath: string): string | undefined {
    // .webmanifest is JSON, and Prettier's own `--write .` formats it as JSON,
    // so generated manifests have to match or they'd drift on the next format run.
    if (filePath.endsWith('.json') || filePath.endsWith('.webmanifest'))
        return 'json';
    if (filePath.endsWith('.ts')) return 'typescript';
    if (filePath.endsWith('.js')) return 'babel';
    return undefined;
}

/**
 * Write `content` to `filePath`, formatted with the project's Prettier config so
 * generated/translated locale, tutorial, and source files produce clean,
 * reviewable diffs (no spurious reindentation or line-wrapping on the next manual
 * prettier run). Config is resolved from the file's own path so the right
 * `.prettierrc` is found regardless of cwd. Falls back to a raw write (with a
 * warning) for formats Prettier can't parse or if formatting throws, so a write
 * is never lost to a formatting error.
 *
 * Writes only when the formatted output differs from what's on disk (returns
 * whether it wrote), so re-runs don't churn git or prime file-watcher loops.
 * Pass `write: false` to make it read-only — it still returns whether the file
 * WOULD change, so a verify pass can detect drift without mutating.
 */
export default async function writeFormatted(
    filePath: string,
    content: string,
    write: boolean = true,
    /** Optional, so this leaf utility's 17 callers don't all have to thread a
     *  logger through for one warning. Falls back to console.warn. */
    log?: Log,
): Promise<boolean> {
    const parser = parserFor(filePath);
    let output = content;
    if (parser !== undefined) {
        try {
            const options = await prettier.resolveConfig(filePath);
            output = await prettier.format(content, { ...options, parser });
        } catch (error) {
            const message = `Prettier could not format ${filePath}; writing raw. ${String(error)}`;
            if (log !== undefined) log.warning(message);
            else console.warn(message);
        }
    }
    const existing = fs.existsSync(filePath)
        ? fs.readFileSync(filePath, 'utf8')
        : undefined;
    if (existing === output) return false;
    if (write) fs.writeFileSync(filePath, output);
    return true;
}
