import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

/**
 * Every identity-bearing localStorage key is namespaced per tab (#1313).
 *
 * localStorage is per *origin*, not per tab — the one thing a proxy tab cannot
 * isolate by opening its own database or its own auth session. Without a
 * prefix, a read-only session looking at somebody else's Wordplay overwrites
 * the administrator's own locale, layout, tutorial progress and tours on their
 * own device, and drags that creator's state into their other tabs. `Setting`
 * covers forty-two of these with one prefix; the ones below reach localStorage
 * without going through it, and each had to be found by hand.
 *
 * So this refuses a *string literal* key: anything new must either be built
 * from `proxyPrefix()` or be named here as safe to share between the two tabs.
 */

/** Files that may touch localStorage without namespacing, and why. */
const Shared: Record<string, string> = {
    'src/input/Webpage/Webpage.ts':
        'Per-device rate limiting for webpage fetches (`domainRequests`). Says nothing about who is signed in, and both tabs wanting the same budget is correct.',
};

function sources(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) sources(full, found);
        else if (/\.(ts|svelte)$/.test(entry) && !entry.endsWith('.test.ts'))
            found.push(full);
    }
    return found;
}

/**
 * Checked per *file*, not per call.
 *
 * The first draft matched a quoted key handed straight to `localStorage`, and
 * missed every place that assigns the key to a constant first — which is how
 * `localePrompt.ts` and `ProjectsDatabase` both do it. It passed while the leak
 * it exists to prevent was sitting in the tree. Asking "does this file know
 * about proxy sessions at all" cannot be dodged by moving the string.
 */
test('every file that uses localStorage namespaces its keys', () => {
    const offenders: string[] = [];
    for (const file of sources(path.join(process.cwd(), 'src'))) {
        const relative = path.relative(process.cwd(), file);
        if (relative in Shared) continue;
        const source = readFileSync(file, 'utf8');
        // Comments stripped first: three files discuss localStorage without
        // touching it, and flagging those would teach people to silence this.
        const code = source
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*\/\/.*$/gm, '')
            .replace(/([^:])\/\/.*$/gm, '$1');
        if (!code.includes('localStorage')) continue;
        if (code.includes('proxyPrefix')) continue;
        offenders.push(relative);
    }
    expect(
        offenders,
        'build the key with proxyPrefix(), or add the file to Shared with a reason',
    ).toEqual([]);
});

test('the shared exemptions are still files that use localStorage', () => {
    // An exemption for a file that no longer touches storage is a comment
    // pretending to be a check.
    for (const file of Object.keys(Shared))
        expect(
            readFileSync(path.join(process.cwd(), file), 'utf8'),
            `${file} is exempted but no longer uses localStorage`,
        ).toContain('localStorage');
});
