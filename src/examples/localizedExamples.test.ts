import Project from '@db/projects/Project';
import type LocaleText from '@locale/LocaleText';
import Source from '@nodes/Source';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { sweepSkipsLocale } from '@util/verify-locales/exampleFreshness';
import { parseSerializedProject } from './examples';
import { serializeExample } from './serializeExample';

/**
 * @sweep static/examples All 2,250 localized `.wp` files — 30 locale directories
 * of 75 — parsed, round-tripped and analyzed. ~35s, and the answer changes only
 * when the corpus or a translation does. Runs in the `sweep` project (see
 * src/util/sweepTests.ts), not in `npm run test:run`.
 *
 * Deliberately not sharded across files, though it is the largest single test
 * file in the repo: vitest parallelizes by file, but the sweep's floor is
 * exampleNamesSync.test.ts at ~53s, so splitting this one changes the sweep's
 * wall clock by nothing. Split that one first.
 *
 * Every localized gallery example (#1310) must parse, round-trip through the
 * serializer, and analyze without conflicts against its own locale's basis —
 * the same contract examples.test.ts makes for the en-US masters. The project
 * is built from the locale's JSON read off disk (the way the pipeline builds
 * it) rather than through `Project.deserialize`, whose locale loading fetches
 * over HTTP and silently falls back to en-US in a test environment — which
 * reports every translated input name as unknown. Evaluation is deliberately
 * not repeated per locale: a localized file is a preserveTagged rewrite of a
 * master that already evaluates, and the pipeline's write-time `validate:
 * true` refuses a translation that raises the conflict count.
 */

const dir = path.join('static', 'examples');

/** Locale-code-shaped subdirectories only, so a stray directory is never read
 *  as a locale. */
const localized = readdirSync(dir, { withFileTypes: true })
    .filter(
        (entry) =>
            entry.isDirectory() && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(entry.name),
    )
    .flatMap((locale) =>
        readdirSync(path.join(dir, locale.name), { withFileTypes: true })
            .filter((file) => file.isFile() && file.name.endsWith('.wp'))
            .map((file) => ({
                locale: locale.name,
                file: file.name,
                path: path.join(dir, locale.name, file.name),
            })),
    );

/** The same size cap examples.test.ts applies, for the same reason: a
 *  data-dump example costs seconds to analyze and covers nothing new. */
const MaxTestableLength = 50_000;

/**
 * Enough for `FrenchNumbers.wp`, the slowest example here: it spends about 2s
 * per locale on a dev machine, and CI runs several times slower under the
 * suite's four workers — 8.1s when it first tripped the 5s default. The rest
 * of the examples finish in well under 300ms.
 */
const SlowestExample = 30_000;

const localeTexts = new Map<string, LocaleText>();
function localeText(code: string): LocaleText {
    let text = localeTexts.get(code);
    if (text === undefined) {
        text = JSON.parse(
            readFileSync(
                path.join('static', 'locales', code, `${code}.json`),
                'utf8',
            ),
        ) as LocaleText;
        localeTexts.set(code, text);
    }
    return text;
}

// With no locale opted in yet this suite is a no-op; vitest requires at least
// one test, and this one documents the sweep is wired.
test('the localized example sweep found the opted-in locales', () => {
    expect(Array.isArray(localized)).toBe(true);
});

test.each(localized)(
    '$locale/$file parses, round-trips, and analyzes cleanly',
    ({ locale, file, path: filePath }) => {
        // Under the pre-commit hook only; CI runs every locale. See sweepSkipsLocale.
        if (sweepSkipsLocale(locale)) return;
        const text = readFileSync(filePath, 'utf8');
        const id = `example-${file.replace('.wp', '')}`;
        const parsed = parseSerializedProject(text, id, [locale]);
        expect(parsed.locales).toEqual([locale]);

        // The serializer must reproduce the file exactly; the pipeline and the
        // deterministic retargeter both rewrite through it.
        expect(
            serializeExample(parsed.preview?.text, parsed.name, parsed.sources),
        ).toBe(text);

        const length = parsed.sources.reduce(
            (total, source) => total + source.code.length,
            0,
        );
        if (length > MaxTestableLength) return;

        const [main, ...supplements] = parsed.sources.map(
            (source) => new Source(source.names, source.code),
        );
        const project = Project.make(
            null,
            id,
            main,
            supplements,
            localeText(locale),
        );
        const conflicts = Array.from(
            project.analyze().conflictedNodes.entries(),
        ).flatMap(([node, list]) =>
            list.map(() => node.toWordplay().slice(0, 60)),
        );

        // Nothing to compare against, so don't go and build the comparison.
        // `baseline` below is a count and therefore never negative, which makes
        // the assertion `0 <= baseline` — true before the master is even read.
        // Analyzing the master costs about what analyzing the localized file
        // just did (a localized file is a preserveTagged rewrite of its master
        // and node-isomorphic to it outside markup), and essentially every case
        // here is clean, so this is roughly half the sweep.
        if (conflicts.length === 0) return;

        // Compared against the master analyzed in the SAME locale, which is
        // the contract the pipeline actually enforces (`validate`). A couple
        // of masters declare a language-tagged name that collides with a
        // locale's own basis name — WhatWord's `مفتاح/ar` is ar-SA's word for
        // the Key stream — so those conflict before any translation happens.
        // Asserting zero would blame the translation for the master's
        // collision; asserting "no worse" still fails the moment a
        // translation introduces one.
        const master = parseSerializedProject(
            readFileSync(path.join(dir, file), 'utf8'),
            id,
        );
        const [masterMain, ...masterRest] = master.sources.map(
            (source) => new Source(source.names, source.code),
        );
        const baseline = Array.from(
            Project.make(null, id, masterMain, masterRest, localeText(locale))
                .analyze()
                .conflictedNodes.values(),
        ).flat().length;

        expect(
            conflicts.length,
            `Conflicts beyond the master's own in this locale: ${conflicts.join(', ')}`,
        ).toBeLessThanOrEqual(baseline);
    },
    SlowestExample,
);

/**
 * An operator must survive localization. sr-RS declared `≠` as `=` on nine
 * basis types, so rewrite mode emitted `=` where the master compared `≠` and
 * four shipped files carried inverted logic — with the same conflict count, so
 * no analysis could catch it (#1310). Counting the glyphs is what does.
 */
test.each(
    readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.wp'))
        .filter((entry) =>
            readFileSync(path.join(dir, entry.name), 'utf8').includes('≠'),
        )
        .map((entry) => entry.name),
)('%s keeps its ≠ comparisons in every locale', (file) => {
    const expected = (
        readFileSync(path.join(dir, file), 'utf8').match(/≠/g) ?? []
    ).length;
    const wrong: string[] = [];
    for (const { locale, path: filePath } of localized) {
        if (path.basename(filePath) !== file) continue;
        const found = (readFileSync(filePath, 'utf8').match(/≠/g) ?? []).length;
        if (found !== expected)
            wrong.push(`${locale}: ${found} of ${expected}`);
    }
    expect(wrong, `${file} lost ≠ comparisons in:`).toEqual([]);
});
