import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { expect, test } from 'vitest';

/**
 * Guard for the centralized-Announcer convention (see CLAUDE.md): all
 * dynamic screen-reader announcements go through Announcer.svelte's single
 * aria-live region, because parallel live regions trample each other on real
 * screen readers. Adding a component-local aria-live region fails this test;
 * use getAnnouncer() instead.
 */
const ANNOUNCER = 'src/components/project/Announcer.svelte';

function svelteFilesUnder(directory: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) found.push(...svelteFilesUnder(path));
        else if (entry.endsWith('.svelte')) found.push(path);
    }
    return found;
}

test('no aria-live regions outside the Announcer', () => {
    const root = resolve(__dirname, '../..');
    const offenders = svelteFilesUnder(resolve(root, 'src'))
        .filter((path) => readFileSync(path, 'utf-8').includes('aria-live='))
        .map((path) => relative(root, path))
        .filter((path) => path !== ANNOUNCER);
    expect(
        offenders,
        `Component-local aria-live region(s) found. Use the centralized Announcer (getAnnouncer()) instead — see CLAUDE.md. If this is truly the Announcer moving, update this test.`,
    ).toEqual([]);
});
