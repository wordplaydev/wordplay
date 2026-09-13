import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { expect, test } from 'vitest';

/**
 * `shared-types` may be imported for types, never for values.
 *
 * Its `package.json` points `main` at an `index.js` that does not exist — it is
 * a folder of TypeScript consumed by two compilers, not a built package. A type
 * import is erased and costs nothing; a *value* imported by that name
 * type-checks, compiles, and then throws `Cannot find package` the moment the
 * functions runtime loads it, taking every callable in `index.ts` with it.
 *
 * Nothing catches that earlier: vitest resolves the specifier to the TypeScript
 * source through the root symlink, and `tsc` is satisfied by the types. It
 * surfaced as every sign-in and join end-to-end test timing out, with the real
 * error only in the emulator's log.
 *
 * Inside `functions/`, values from that folder come through the relative
 * `./shared/index.js`, which compiles to real output beside the caller.
 */

const Functions = resolve(__dirname, '../../functions/src');

function sources(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        // Its own vendored node_modules, and tsc's output.
        if (entry === 'node_modules' || entry === 'lib') continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) sources(path, found);
        else if (entry.endsWith('.ts')) found.push(path);
    }
    return found;
}

test('nothing in functions/ imports a value from shared-types', () => {
    const offenders = sources(Functions).filter((path) => {
        const source = readFileSync(path, 'utf-8');
        return [
            ...source.matchAll(
                /import\s+(type\s+)?\{[^}]*\}\s+from\s+'shared-types';/g,
            ),
        ].some((match) => match[1] === undefined);
    });
    expect(
        offenders.map((path) => path.slice(Functions.length + 1)),
        'import values through ./shared/index.js instead',
    ).toEqual([]);
});
