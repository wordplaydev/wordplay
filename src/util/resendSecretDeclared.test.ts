import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { describe, expect, test } from 'vitest';

/**
 * Every function that can send mail must declare the Resend secret.
 *
 * A `defineSecret` reaches a function as an environment variable only when that
 * function names it. Forget, and `process.env.RESEND_API_KEY` is undefined at
 * runtime, `sendEmails` logs and swallows, and the deploy is green while no
 * mail ever arrives — the quietest failure in this whole area, and one no type
 * or unit test would catch.
 *
 * A text-level check rather than an import, because `index.ts` value-imports
 * `firebase-functions`, which the root `npm ci` does not install.
 */

const Functions = resolve(__dirname, '../../functions/src');

/** Every module `path` reaches through relative imports. */
function cone(path: string, seen = new Set<string>()): Set<string> {
    if (seen.has(path)) return seen;
    seen.add(path);
    let source: string;
    try {
        source = readFileSync(path, 'utf-8');
    } catch {
        return seen;
    }
    for (const match of source.matchAll(
        /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g,
    )) {
        const specifier = match[1];
        if (specifier === undefined) continue;
        // Written `./x.js` for ESM, but the file on disk is `./x.ts`.
        const resolved = join(dirname(path), specifier.replace(/\.js$/, '.ts'));
        cone(resolved, seen);
    }
    return seen;
}

/** Whether this handler module can reach the sender. */
function sends(handler: string): boolean {
    return [...cone(join(Functions, handler))].some((file) =>
        file.endsWith(join('email', 'send.ts')),
    );
}

const index = readFileSync(join(Functions, 'index.ts'), 'utf-8');

/**
 * Every binding `index.ts` imports from a local module, and the module it came
 * from. Named imports as well as default ones: the digests are registered with
 * an inline arrow that calls a named export, so a default-only scan checked the
 * triggers and quietly skipped the two functions whose whole job is sending.
 */
function importedHandlers(): Map<string, string> {
    const handlers = new Map<string, string>();
    for (const match of index.matchAll(
        /import\s+(?:(\w+)|\{([^}]*)\})\s+from\s+'\.\/([\w./-]+)\.js';/g,
    )) {
        const [, fallback, named, module] = match;
        if (module === undefined) continue;
        const bindings =
            fallback !== undefined
                ? [fallback]
                : (named ?? '')
                      .split(',')
                      .map(
                          (binding) =>
                              binding
                                  .trim()
                                  .split(/\s+as\s+/)
                                  .pop() ?? '',
                      )
                      .filter((binding) => binding !== '');
        for (const binding of bindings) handlers.set(binding, `${module}.ts`);
    }
    return handlers;
}

describe('anything that sends mail declares the secret', () => {
    const handlers = importedHandlers();
    const senders = [...handlers.entries()].filter(([, module]) =>
        sends(module),
    );

    test('at least one sender is found, or this test is asleep', () => {
        // A refactor that renames the send module would otherwise make every
        // case below vacuously pass.
        expect(senders.length).toBeGreaterThan(0);
    });

    /** The one `export const … = on…(…)` block registering this handler.
     *  Split on the declaration keyword rather than matched across the file: a
     *  lazy pattern happily ran from an earlier registration to this handler's
     *  name and swept up someone else's `resendKey`, which made this test pass
     *  while the secret was missing. */
    function registration(alias: string): string | undefined {
        return index
            .split(/^export const /m)
            .slice(1)
            .map((block) => block.split(');')[0] ?? '')
            .find((block) => new RegExp(`\\b${alias}\\b`).test(block));
    }

    test.each(senders)('%s declares resendKey', (alias) => {
        const block = registration(alias);
        expect(
            block,
            `${alias} is imported but never registered`,
        ).toBeDefined();
        expect(block).toContain('resendKey');
    });
});
