import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import { LocaleSections } from '@util/verify-locales/localeFiles';

/**
 * Guard for the one fragile thing about the section layout: which files in a
 * locale directory are source and which are generated.
 *
 * A locale code contains hyphens (`ta-IN-LK-SG.json`), so no glob separates the
 * assembled `<code>.json` from `<code>-tutorial.json` by shape alone. `.gitignore`
 * therefore ignores every top-level `.json` in a locale directory and exempts the
 * known kinds by name — which means a *new* kind of per-locale file would be
 * silently ignored, committed by nobody, and missing in production with nothing
 * failing. This test is what turns that into a failure.
 */

/** The per-locale files that are authored and committed. */
const TrackedSuffixes = [
    '-datetimes.json',
    '-emojis.json',
    '-how.json',
    '-tutorial.json',
    '-tutorial-quick.json',
    '-updates.json',
];

function ignored(file: string): boolean {
    try {
        execFileSync('git', ['check-ignore', '-q', file]);
        return true;
    } catch {
        return false;
    }
}

const localeDirectories = fs
    .readdirSync(path.join('static', 'locales'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

test('every locale directory has its sections', () => {
    for (const locale of localeDirectories) {
        // en-US is the asymmetry: its directory under static/ holds the
        // tutorials and how-tos, but its locale document is imported rather
        // than fetched, so its sections live under src/locale/ instead. The
        // last test in this file checks those.
        if (locale === 'en-US') continue;
        const sections = path.join('static', 'locales', locale, 'sections');
        expect(fs.existsSync(sections), `${locale} has no sections/`).toBe(
            true,
        );
        for (const section of LocaleSections)
            expect(
                fs.existsSync(path.join(sections, section)),
                `${locale} is missing ${section}`,
            ).toBe(true);
    }
});

test('only the assembled document is ignored in a locale directory', () => {
    const wrong: string[] = [];
    for (const locale of localeDirectories) {
        const directory = path.join('static', 'locales', locale);
        for (const entry of fs.readdirSync(directory, {
            withFileTypes: true,
        })) {
            if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
            const file = path.join(directory, entry.name);
            // en-US has no assembled document under static/.
            const isAssembled =
                locale !== 'en-US' && entry.name === `${locale}.json`;
            const isKnown = TrackedSuffixes.some((suffix) =>
                entry.name.endsWith(suffix),
            );
            if (isAssembled && !ignored(file))
                wrong.push(`${file} is the generated assembly but is tracked`);
            else if (isKnown && ignored(file))
                wrong.push(`${file} is authored but is gitignored`);
            else if (!isAssembled && !isKnown)
                wrong.push(
                    `${file} is a new kind of per-locale file; add its suffix to .gitignore's exemptions and to TrackedSuffixes here, or it ships missing`,
                );
        }
    }
    expect(wrong).toEqual([]);
});

test('the assembled en-US is generated, not authored', () => {
    // Everything imports it, so if it were committed it would carry the
    // whole-file diff the split exists to remove.
    expect(ignored(path.join('src', 'locale', 'en-US.json'))).toBe(true);
    expect(fs.existsSync(path.join('src', 'locale', 'en-US', 'sections'))).toBe(
        true,
    );
});
