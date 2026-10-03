import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { expect, test } from 'vitest';
import DefaultLocale from '#locale/DefaultLocale.ts';

/**
 * Every announcement string in `ui.feedback` and `ui.edit` is used somewhere.
 * Eight of them (the search and menu confirmations, tidy's no-op) were declared,
 * translated into thirty languages, and referenced by nothing, which is how a
 * feature can look audible on paper and be silent in use. A key that is no
 * longer spoken should be removed rather than left for translators.
 */

function sourceFilesUnder(directory: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) found.push(...sourceFilesUnder(path));
        else if (
            (entry.endsWith('.ts') || entry.endsWith('.svelte')) &&
            !entry.endsWith('.test.ts') &&
            !entry.endsWith('.generated.ts')
        )
            found.push(path);
    }
    return found;
}

const root = resolve(__dirname, '../..');
const sources = sourceFilesUnder(resolve(root, 'src')).map((path) =>
    readFileSync(path, 'utf-8'),
);

function referenced(section: string, key: string): boolean {
    const accessor = `${section}.${key}`;
    return sources.some((text) => text.includes(accessor));
}

test.each([
    ['ui.feedback', Object.keys(DefaultLocale.ui.feedback)],
    ['ui.edit', Object.keys(DefaultLocale.ui.edit)],
])('every %s key is referenced by an accessor', (section, keys) => {
    const unused = keys.filter((key) => !referenced(section, key));
    expect(
        unused,
        `declared under ${section} but spoken nowhere; wire it up or delete it`,
    ).toEqual([]);
});
