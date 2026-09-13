import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { describe, expect, test } from 'vitest';

/**
 * What `scripts/emails/` may reach, and why it matters.
 *
 * The root `tsconfig.json` covers `src/`, `tests/` and `scripts/` but not
 * `functions/`, and the root `npm ci` does not install `functions/node_modules`
 * — it has no `firebase-functions`, no `resend`, no `@supercharge/promise-pool`.
 * So the moment anything under those three directories imports a module in
 * `functions/src/`, that module *and its whole static import cone* joins
 * `svelte-check`'s program, and a specifier the root cannot resolve is TS2307.
 *
 * `import type` does not save you: it still needs resolution to type-check.
 * Vitest is immune, because esbuild strips type imports before resolving, which
 * is exactly why this would pass locally and fail in CI.
 *
 * So: the contact sheet's entry point may not reach the sender, and nothing in
 * its cone may name a package the root install lacks.
 */

const Root = resolve(__dirname, '../..');
const Entry = resolve(Root, 'functions/src/email/registry.ts');

type Reach = { files: Set<string>; packages: Set<string> };

/** Every module and package `path` reaches through static imports. */
function reach(path: string, found: Reach): Reach {
    if (found.files.has(path)) return found;
    found.files.add(path);
    if (!existsSync(path)) return found;
    const source = readFileSync(path, 'utf-8');
    for (const match of source.matchAll(
        /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g,
    )) {
        const specifier = match[1];
        if (specifier === undefined) continue;
        if (specifier.startsWith('.'))
            reach(
                join(dirname(path), specifier.replace(/\.js$/, '.ts')),
                found,
            );
        else found.packages.add(specifier);
    }
    return found;
}

/** Whether the root install can resolve this package, as `tsc` would need to. */
function resolvableFromRoot(specifier: string): boolean {
    const parts = specifier.split('/');
    const name = specifier.startsWith('@')
        ? parts.slice(0, 2).join('/')
        : parts[0];
    return existsSync(join(Root, 'node_modules', name ?? ''));
}

describe('the contact sheet stays inside what the root install has', () => {
    const found = reach(Entry, { files: new Set(), packages: new Set() });

    test('the entry point exists, or this test is asleep', () => {
        expect(existsSync(Entry)).toBe(true);
        expect(found.files.size).toBeGreaterThan(1);
    });

    test('it never reaches the sender', () => {
        // `send.ts` dynamically imports `resend`, which the root does not have.
        const sender = [...found.files].find((file) =>
            file.endsWith(join('email', 'send.ts')),
        );
        expect(
            sender,
            'registry.ts reaches send.ts, which would break svelte-check in CI',
        ).toBeUndefined();
    });

    test.each([...found.packages])('%s resolves from the root', (specifier) => {
        expect(
            resolvableFromRoot(specifier),
            `${specifier} is not installed at the root, so tsc cannot resolve it`,
        ).toBe(true);
    });
});
