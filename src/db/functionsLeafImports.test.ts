import { matchGroups, must } from '@util/nullable';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

/**
 * A test on this side may only reach a leaf of `functions/`.
 *
 * The root `tsconfig.json` covers `src/`, `tests/` and `scripts/` but the root
 * `npm ci` installs no `functions/node_modules`. So a test here that imports a
 * functions module which imports `firebase-functions` or `firebase-admin`
 * type-checks locally — where those packages happen to exist — and fails
 * `svelte-check` in CI with "Cannot find module". Locally there is nothing to
 * see; `npm run check:now` is clean.
 *
 * That is not hypothetical: it is how this repository's CI went red. The fix
 * each time is the same — split the logic worth testing into a module with no
 * platform imports, the way `strikes.ts`, `responsibility.ts` and now
 * `claimChanges.ts` are — so this checks the shape instead of waiting for CI.
 *
 * To reproduce CI by hand: `mv functions/node_modules` aside and run
 * `npm run check:now`.
 */

/** Packages that exist only inside `functions/node_modules`. */
const PlatformOnly = ['firebase-functions', 'firebase-admin'];

/** Every `functions/` module imported from this side, with the file that does. */
function reaches(): { from: string; module: string }[] {
    const found: { from: string; module: string }[] = [];
    const roots = ['src', 'tests', 'scripts'];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (/\.(ts|svelte)$/.test(entry.name)) {
                const source = readFileSync(full, 'utf8');
                for (const match of source.matchAll(
                    /from '([^']*functions\/src\/[^']+)'/g,
                )) {
                    // The one group is mandatory, so a match always carries it.
                    const [, module] = matchGroups(match);
                    found.push({
                        from: path.relative(process.cwd(), full),
                        module: must(module, 'a matched module path'),
                    });
                }
            }
        }
    };
    for (const root of roots) walk(path.join(process.cwd(), root));
    return found;
}

test('nothing in src, tests or scripts reaches a functions module that needs the platform', () => {
    const offenders: string[] = [];
    for (const { from, module } of reaches()) {
        // Resolve the import back to a file so its own imports can be read.
        const resolved = path.resolve(path.dirname(from), module) + '.ts';
        let source: string;
        try {
            source = readFileSync(resolved, 'utf8');
        } catch {
            continue;
        }
        for (const platform of PlatformOnly)
            if (
                new RegExp(`from '${platform}(/[^']*)?'`).test(source) &&
                !offenders.includes(`${from} → ${module}`)
            )
                offenders.push(`${from} → ${module}`);
    }
    expect(
        offenders,
        'split the part worth testing into a functions module with no firebase-functions or firebase-admin import, and import that instead',
    ).toEqual([]);
});
