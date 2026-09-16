import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

/**
 * An account export refuses a read-only session, and the refusal cannot live in
 * the security rules (#152, #1313).
 *
 * A proxy tab holds a real ID token for the creator being looked at, so every
 * read an export makes is a read that creator may legitimately make.
 * `notProxying()` in `firestore.rules` guards writes, and an export writes
 * nothing; `noProxy()` guards callables, and an export is not one. So the only
 * place the line can be drawn is here, in the client, before the first read —
 * and a line drawn in one place by remembering is a line that moves.
 *
 * Hence a check per *file* rather than per call, for the reason
 * `proxyStorageConvention.test.ts` records about its own first draft: asking
 * "does this file know about proxy sessions at all" cannot be dodged by moving
 * the read into a helper. It is also what decides this folder's shape — the
 * Firestore reads and the guard sit in one module, so the rule is satisfied by
 * construction rather than by a reviewer noticing.
 */

const Folder = 'src/db/export';

/** Files here that may read Firestore without consulting the guard, and why.
 *  Empty, and it should stay that way: a second module that reads a creator's
 *  records is a second place the refusal can be forgotten. */
const Exempt: Record<string, string> = {};

/** Comments are stripped before matching: a module that merely *mentions* a
 *  read in its documentation must not satisfy the rule, and one that explains
 *  the guard in prose must not satisfy it either. */
function code(text: string): string {
    return text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sources(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) sources(full, found);
        else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts'))
            found.push(full);
    }
    return found;
}

test('every file that reads a creator record refuses a read-only session', () => {
    const offenders = sources(Folder)
        .filter((file) => {
            const source = code(readFileSync(file, 'utf8'));
            const reads = /\bgetDocs?\s*\(/.test(source);
            return reads && !source.includes('isProxySession');
        })
        .map((file) => file.split(path.sep).join('/'))
        .filter((file) => Exempt[file] === undefined);

    expect(
        offenders,
        `These files read Firestore without consulting isProxySession. An administrator looking at someone else's account would be able to download it. Either guard the read, or move it into exportAccount.ts, which already does.`,
    ).toEqual([]);
});

test('the guard is actually reachable from the module that exports', () => {
    // The rule above is satisfiable by a file that names `isProxySession` in
    // dead code, so assert the one that matters really imports it.
    const source = readFileSync(`${Folder}/exportAccount.ts`, 'utf8');
    // Matched loosely on purpose: the module legitimately imports
    // `proxyPrefix` alongside, and a regex that pinned the exact import list
    // would fail for a reason that has nothing to do with the rule.
    expect(source).toMatch(
        /import\s*\{[^}]*\bisProxySession\b[^}]*\}\s*from\s*'@db\/proxySession'/,
    );
});
