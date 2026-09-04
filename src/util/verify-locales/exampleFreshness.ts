/**
 * Whether a locale's gallery examples can have gone stale since the branch
 * point, so a verify run can skip re-deriving the ones that provably haven't.
 *
 * #1310 gave all 31 locales a `static/examples/<locale>/` directory of 75 `.wp`
 * files, and verifying them re-parses every one against its en-US master — which
 * doubled `npm run locales` (~245s to ~510s in CI). Most changes touch no example
 * at all, so the useful question isn't "are these files in sync" but the one
 * `driftSince` already asks of translations: "did *this change* break them?"
 *
 * The base is `getDriftBase()`, the same merge-base the drift gate uses, so both
 * halves of the verifier answer relative to the same commit. When git can't
 * answer — no repository, no `main` to merge-base against, a failed command —
 * every locale reports changed and the full pass runs. Skipping is the
 * optimization; verifying is the fallback.
 */

import { execFileSync } from 'node:child_process';
import { getDriftBase } from './drift';

// Git reports paths with forward slashes on every platform, so these are spelled
// literally rather than built with `path.join` (which would use backslashes on
// Windows and match nothing). They are compared against git output, never opened.
const ExamplesPrefix = 'static/examples/';
const DefaultLocaleFile = 'src/locale/en-US.json';

/**
 * Paths changed since the base, or undefined when git couldn't say. Includes
 * uncommitted and untracked files: `npm run locales` runs in watch mode while
 * someone edits, and an edit that hasn't been committed still changes the answer.
 */
function changedSinceBase(cwd?: string): Set<string> | undefined {
    // CI passes the base explicitly, exactly as the drift job does: a PR's base
    // commit, or the previous tip of main on a push. Without it a shallow clone
    // has no `main` to merge-base against (so nothing would be skipped), and a
    // push to main would merge-base to HEAD itself and skip *everything*.
    const base = process.env.WORDPLAY_LOCALES_BASE || getDriftBase(cwd);
    if (base === undefined || base === '') return undefined;
    try {
        const run = (args: string[]) =>
            execFileSync('git', args, {
                cwd,
                encoding: 'utf8',
                maxBuffer: 32 * 1024 * 1024,
                stdio: ['pipe', 'pipe', 'pipe'],
            })
                .split('\n')
                .filter((line) => line.length > 0);
        // A base that resolves to HEAD can produce no differences, so it would
        // report every locale unchanged and skip the whole pass. That is what a
        // merge-base against main looks like when you *are* main, so treat it as
        // no answer and verify everything.
        const [baseSha, headSha] = [base, 'HEAD'].map((ref) =>
            run(['rev-parse', ref]).join(''),
        );
        if (baseSha === headSha) return undefined;
        return new Set([
            // Working tree against the base: committed and uncommitted alike.
            ...run(['diff', '--name-only', base, '--']),
            ...run(['ls-files', '--others', '--exclude-standard']),
        ]);
    } catch {
        return undefined;
    }
}

/** Memoized so 31 locales cost one git invocation, not 31. */
let Changed: Set<string> | undefined | 'unset' = 'unset';

function changed(cwd?: string): Set<string> | undefined {
    if (Changed === 'unset') Changed = changedSinceBase(cwd);
    return Changed;
}

/** Only for tests, which change the working tree between cases. */
export function resetExampleFreshness(): void {
    Changed = 'unset';
}

/**
 * Whether anything a retarget of this locale's examples reads has changed since
 * the base. Four inputs decide a retarget's result, and all four are files: the
 * en-US masters, the locale's own `.wp` files, the locale's names, and en-US's
 * names (the oracle the masters resolve against).
 *
 * Deliberately coarse. A locale that renamed one word re-verifies all 75 of its
 * examples, because a name is read by every one of them; the win is the other 30
 * locales, which a change to this one cannot reach.
 */
export function localeExamplesMayHaveChanged(
    locale: string,
    /** The repository to ask; only tests pass one, the way `drift.ts` does. */
    cwd?: string,
): boolean {
    const paths = changed(cwd);
    // No answer from git means no skipping: verify everything.
    if (paths === undefined) return true;
    const localeExamples = `${ExamplesPrefix}${locale}/`;
    for (const file of paths) {
        // A master (directly under the examples root), or one of this locale's own.
        if (file.startsWith(ExamplesPrefix)) {
            const rest = file.slice(ExamplesPrefix.length);
            if (!rest.includes('/') || file.startsWith(localeExamples))
                return true;
        }
        // The names this locale declares, or the en-US names they resolve against.
        if (
            file === DefaultLocaleFile ||
            file === `static/locales/${locale}/${locale}.json`
        )
            return true;
    }
    return false;
}
