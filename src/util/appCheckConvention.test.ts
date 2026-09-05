import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

/**
 * Every path that writes to Firebase Auth must attest first (#1299).
 *
 * App Check enforcement on Firebase Authentication is a console setting, not a
 * code change — so the day it is flipped from monitor to enforce, any sign-in,
 * account creation, address change, or deletion that never called
 * `ensureAppCheck` starts failing. Nothing in the app would say why, and the
 * failure would land on someone trying to get into their own account.
 *
 * `ensureAppCheck` is deliberately *not* called from `ensureAuth` — that runs on
 * every page load for every visitor, including someone who only opened a shared
 * project, and an assessment is created on every token refresh. So the calls are
 * per-handler, and this test is what keeps a new handler from forgetting one.
 */

/** Auth operations that reach Identity Toolkit to change or establish a session. */
const AuthWrites = [
    'createUserWithEmailAndPassword',
    'signInWithEmailAndPassword',
    'signInWithEmailLink',
    'signInWithCustomToken',
    'verifyBeforeUpdateEmail',
    'updatePassword',
    'deleteUser',
    'reauthenticateWithCredential',
];

/**
 * Files that name one of these without performing it.
 *
 * `firebase.ts` owns `ensureAppCheck` itself, and its one sign-in is the
 * `import.meta.hot`-gated dev auto-login, which only ever runs against the
 * emulator — where App Check is skipped by design.
 */
const Exempt = new Set([
    'src/db/firebase.ts',
    // Client wrappers around callables: the callable path attests inside
    // getFunctionsInstance, and these only mention the operations in comments.
    'src/db/creators/join.ts',
    'src/db/creators/signinMethod.ts',
]);

function sourceFiles(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) sourceFiles(full, found);
        else if (/\.(ts|svelte)$/.test(entry) && !entry.endsWith('.test.ts'))
            found.push(full);
    }
    return found;
}

test('every file that writes to Firebase Auth attests first', () => {
    const root = process.cwd();
    const offenders: string[] = [];
    for (const file of sourceFiles(path.join(root, 'src'))) {
        const relative = path.relative(root, file);
        if (Exempt.has(relative)) continue;
        const source = readFileSync(file, 'utf-8');
        // Only count a real call, not an import or a mention in a comment.
        const writes = AuthWrites.filter((name) =>
            new RegExp(`\\b${name}\\s*\\(`).test(source),
        );
        if (writes.length === 0) continue;
        if (!source.includes('ensureAppCheck'))
            offenders.push(`${relative} (${writes.join(', ')})`);
    }
    expect(
        offenders,
        `These write to Firebase Auth without calling ensureAppCheck first. Add the call, or exempt the file here with a reason:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
});

test('the exempt list names only files that still exist', () => {
    // An exemption for a deleted file is an exemption nobody notices is stale.
    for (const relative of Exempt)
        expect(() =>
            statSync(path.join(process.cwd(), relative)),
        ).not.toThrow();
});
