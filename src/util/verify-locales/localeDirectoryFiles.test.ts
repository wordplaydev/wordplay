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

/**
 * Which of these paths git ignores, asked in one call.
 *
 * `git check-ignore` takes many paths at once, and asking per file spawned a
 * subprocess for each of ~217 — fast enough locally to look fine and slow
 * enough on a CI runner to blow the 5s test timeout.
 */
function ignoredAmong(files: string[]): Set<string> {
    if (files.length === 0) return new Set();
    try {
        const output = execFileSync('git', ['check-ignore', '--stdin'], {
            input: files.join('\n'),
            encoding: 'utf8',
        });
        return new Set(output.split('\n').filter((line) => line.length > 0));
    } catch (error) {
        // Exit status 1 means "none of them are ignored", which is an answer,
        // not a failure — and it still carries whatever it did match on stdout.
        const stdout: unknown =
            typeof error === 'object' && error !== null
                ? Reflect.get(error, 'stdout')
                : undefined;
        return new Set(
            (typeof stdout === 'string' ? stdout : '')
                .split('\n')
                .filter((line) => line.length > 0),
        );
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
    const candidates: string[] = [];
    for (const locale of localeDirectories)
        for (const entry of fs.readdirSync(
            path.join('static', 'locales', locale),
            { withFileTypes: true },
        ))
            if (entry.isFile() && entry.name.endsWith('.json'))
                candidates.push(
                    path.join('static', 'locales', locale, entry.name),
                );

    const ignored = ignoredAmong(candidates);
    const wrong: string[] = [];

    for (const file of candidates) {
        const locale = path.basename(path.dirname(file));
        const name = path.basename(file);
        // en-US has no assembled document under static/.
        const isAssembled = locale !== 'en-US' && name === `${locale}.json`;
        const isKnown = TrackedSuffixes.some((suffix) => name.endsWith(suffix));

        if (isAssembled && !ignored.has(file))
            wrong.push(`${file} is the generated assembly but is tracked`);
        else if (isKnown && ignored.has(file))
            wrong.push(`${file} is authored but is gitignored`);
        else if (!isAssembled && !isKnown)
            wrong.push(
                `${file} is a new kind of per-locale file; add its suffix to .gitignore's exemptions and to TrackedSuffixes here, or it ships missing`,
            );
    }

    expect(wrong).toEqual([]);
});

test('the assembled en-US is generated, not authored', () => {
    // Everything imports it, so if it were committed it would carry the
    // whole-file diff the split exists to remove.
    expect(ignoredAmong([path.join('src', 'locale', 'en-US.json')]).size).toBe(
        1,
    );
    expect(fs.existsSync(path.join('src', 'locale', 'en-US', 'sections'))).toBe(
        true,
    );
});
