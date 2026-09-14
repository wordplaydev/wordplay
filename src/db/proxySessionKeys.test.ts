import { readFileSync } from 'fs';
import { expect, test } from 'vitest';

/**
 * `proxySession.ts` must stay import-free — it answers at module init, before
 * anything else in the app exists, and it is on every page's import graph. So
 * it spells out the one key it shares with `ProjectsDatabase` rather than
 * importing it, and this is what keeps the two spellings the same.
 *
 * If they drift, a proxy tab silently keeps the administrator's session id, and
 * the two tabs share one presence document and filter out each other's edits —
 * with nothing failing anywhere.
 */
test('proxySession clears the same session id key ProjectsDatabase uses', () => {
    const owner = readFileSync(
        'src/db/projects/ProjectsDatabase.svelte.ts',
        'utf8',
    );
    const proxy = readFileSync('src/db/proxySession.ts', 'utf8');
    const declared = owner.match(/const SessionIDStorageKey = '([^']+)'/)?.[1];
    expect(declared, 'ProjectsDatabase no longer declares one').toBeDefined();
    expect(proxy).toContain(`const SessionIDKey = '${declared}'`);
});

test('proxySession imports nothing', () => {
    // Its whole reason to exist is being cheap enough to sit on five page
    // graphs and early enough to answer before Dexie and Auth are constructed.
    const proxy = readFileSync('src/db/proxySession.ts', 'utf8');
    expect(proxy.match(/^\s*import\s/m)).toBeNull();
});
