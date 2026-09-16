import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import {
    assembleLocale,
    getMonolithPath,
    LocaleSections,
    splitLocale,
} from '@util/verify-locales/localeFiles';

/**
 * That splitting a locale into section files and putting it back is the
 * identity, over every locale that ships.
 *
 * This is the property the whole section layout rests on. Everything
 * downstream — all seventeen checks in `verifyLocale`, `LocaleValidator`,
 * `classifyLocalePath`, the localize workspace — takes the assembled document,
 * so if the round trip is exact, none of them can tell that the file on disk
 * changed shape. If it is not, a locale quietly loses text.
 *
 * @sweep static/locales Every shipped locale document is read and walked, so
 * the cost grows with the number of locales rather than with any code change.
 */

function localeFiles(): [string, string][] {
    const files: [string, string][] = [['en-US', getMonolithPath('en-US')]];
    for (const entry of fs.readdirSync(path.join('static', 'locales'))) {
        const file = getMonolithPath(entry);
        if (fs.existsSync(file)) files.push([entry, file]);
    }
    return files;
}

function read(file: string): Record<string, unknown> {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        throw new Error(`${file} is not an object`);
    const record: Record<string, unknown> = { ...parsed };
    // `$schema` becomes per-file after the split, so it is the one key the
    // round trip is not expected to carry.
    delete record['$schema'];
    return record;
}

test.each(localeFiles())('%s survives split and assemble', (code, file) => {
    const original = read(file);
    expect(
        assembleLocale(splitLocale(original)),
        `${code} did not survive split/assemble`,
    ).toEqual(original);
});

test.each(localeFiles())(
    '%s puts every top-level key in exactly one section',
    (code, file) => {
        const original = read(file);
        const sections = splitLocale(original);
        const counts = new Map<string, number>();
        for (const [section, contents] of sections) {
            expect(LocaleSections).toContain(section);
            for (const key of Object.keys(contents))
                // `ui` is deliberately in two files.
                if (key !== 'ui') counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        for (const key of Object.keys(original))
            if (key !== 'ui') expect(counts.get(key), `${code}.${key}`).toBe(1);
    },
);
