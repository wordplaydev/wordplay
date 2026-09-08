import { parseChangelog, textId, toMarkup } from '../../../scripts/updates';
import { withoutColorSelector } from '@unicode/emoji';
import { toMarkup as parseMarkup } from '@parser/toMarkup';
import fs from 'fs';
import { expect, test } from 'vitest';

/**
 * The gate CHANGELOG.md never had.
 *
 * Nothing checked this file's prose: it is not in the pre-commit hook's trigger
 * list, and `verifyChangelog`'s en-US markup check only runs under
 * `npm run locales`, against a `static/updates.json` that is gitignored and
 * generated at build. So a bulk rewrite of the archive — or one hand-edited
 * entry — could land with no local check at all, which is how the last hand pass
 * over this file (`324cf14`) shipped an entry whose Markdown code span became an
 * unbalanced Example.
 *
 * Deliberately in the `fast` project rather than a sweep: its answer depends on
 * `toMarkup` and the markup parser as much as on the file, which is the sweep
 * list's own stated reason to keep a test out ("a test of code rather than of
 * the corpus"). It also means this runs on every `npm run test:run`, not only
 * when CHANGELOG.md happens to be staged.
 */

const entries = (() => {
    const releases = parseChangelog(
        fs.readFileSync('CHANGELOG.md', 'utf-8'),
    ).filter((release) => release.date !== null);
    const texts: string[] = [];
    for (const release of releases) {
        if (release.summary) texts.push(release.summary);
        for (const kind of ['added', 'changed', 'fixed', 'removed'] as const) {
            for (const entry of release.changes[kind]) texts.push(entry.text);
            const summary = release.summaries[kind];
            if (summary) texts.push(summary);
        }
    }
    return texts;
})();

test('the dated releases still hold entries', () => {
    // A guard on the guard: if the parser stopped recognizing release headings,
    // every check below would pass over an empty list.
    expect(entries.length).toBeGreaterThan(500);
});

test('every entry renders as markup across its whole length', () => {
    // An unclosed container — a lone backtick, an odd number of backslashes —
    // ends the document early, and everything after it is silently dropped
    // rather than reported. The reader sees a sentence stop mid-thought.
    const truncated = entries
        .map((text) => {
            const body = withoutColorSelector(toMarkup(text));
            const [parsed, spaces] = parseMarkup(body);
            return parsed.toWordplay(spaces).length < body.length
                ? text.slice(0, 100)
                : undefined;
        })
        .filter((text): text is string => text !== undefined);
    expect(
        truncated,
        'These entries stop being markup partway through, so the rest never renders. Quote markup you mean literally inside backticks, and double a literal backtick.',
    ).toEqual([]);
});

test('no two entries share an id', () => {
    // Ids key each locale's translations, so a collision would show one entry's
    // translation under another entry. Identical text sharing one id is the
    // point — that is why 17 copies of one boilerplate line are bought once.
    const byId = new Map<string, string>();
    const collisions: string[] = [];
    for (const text of entries) {
        const id = textId(text);
        const seen = byId.get(id);
        if (seen === undefined) byId.set(id, text);
        else if (seen !== text) collisions.push(id);
    }
    expect(collisions).toEqual([]);
});
