import type LocaleText from '@locale/LocaleText';
import type Tutorial from '../../tutorial/Tutorial';
import { TutorialModes } from '../../tutorial/TutorialMode';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import {
    getDefaultTutorial,
    getTutorialPath,
} from '@util/verify-locales/TutorialSchema';
import { getCheckableLocalePairs } from '@util/verify-locales/verifyLocale';
import {
    retargetExamplesIn,
    retargetExamplesInDocument,
    retargetTutorialExamples,
} from '@util/verify-locales/retargetExampleNames';
import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

/**
 * Drift detection for the names inside localized `\…\` examples.
 *
 * An example spells names declared at *other* locale paths, so re-translating one of those
 * names silently strands every example that used it — which shipped as `UnknownInput` in
 * nine locales (#1323) and, more quietly, as ~150 inputs per locale still spelled in
 * English. `npm run locales-fix` re-derives them; this is what makes a stranded example fail
 * `npm test` rather than wait for someone to run the fixer.
 *
 * Read-only: every check asks what the repair *would* write and compares, writing nothing.
 */

const Locales = fs
    .readdirSync(path.join('static', 'locales'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'en-US')
    .map((entry) => entry.name);

/** Parsing every example in every locale is the slow part, and there is no cheaper way to
 *  know an example still names what its locale declares. */
const Timeout = 240_000;

function read<T>(file: string): T | undefined {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return undefined;
    }
}

const English: LocaleText | undefined = read(getLocalePath('en-US'));

test(
    'localized examples name the inputs their locale declares',
    () => {
        expect(English).toBeDefined();
        if (English === undefined) return;
        const stale: string[] = [];
        for (const code of Locales) {
            const locale: LocaleText | undefined = read(getLocalePath(code));
            if (locale === undefined) continue;
            for (const pair of getCheckableLocalePairs(locale)) {
                const source = pair.resolve(English);
                if (source === undefined) continue;
                const sourceItems =
                    typeof source === 'string' ? [source] : source;
                const items =
                    typeof pair.value === 'string' ? [pair.value] : pair.value;
                if (!items.some((item) => item.includes('\\'))) continue;
                // Paired across the document, the way the fixer does: a markup array's items
                // are paragraphs and a locale may legitimately split or merge one.
                const result = retargetExamplesInDocument(
                    sourceItems,
                    items,
                    locale,
                );
                if (result.texts.some((text, index) => text !== items[index]))
                    stale.push(`${code} ${pair.toString()}`);
            }
        }
        expect(
            stale,
            'Run "npm run locales-fix" to retarget these examples.',
        ).toEqual([]);
    },
    Timeout,
);

test(
    'tutorial examples name the inputs their locale declares',
    () => {
        const stale: string[] = [];
        for (const code of Locales) {
            const locale: LocaleText | undefined = read(getLocalePath(code));
            if (locale === undefined) continue;
            for (const mode of TutorialModes) {
                const tutorial: Tutorial | undefined = read(
                    getTutorialPath(code, mode),
                );
                if (tutorial === undefined) continue;
                const tally = retargetTutorialExamples(
                    tutorial,
                    getDefaultTutorial(mode),
                    locale,
                    false,
                );
                if (tally.renamed > 0)
                    stale.push(`${code} ${mode}: ${tally.renamed}`);
            }
        }
        expect(
            stale,
            'Run "npm run locales-fix" to retarget these examples.',
        ).toEqual([]);
    },
    Timeout,
);

test(
    'how-to examples name the inputs their locale declares',
    () => {
        const englishDir = path.join('static', 'locales', 'en-US', 'how');
        const filenames = fs
            .readdirSync(englishDir)
            .filter((name) => name.endsWith('.txt'));
        const stale: string[] = [];
        for (const code of Locales) {
            const locale: LocaleText | undefined = read(getLocalePath(code));
            if (locale === undefined) continue;
            for (const filename of filenames) {
                const target = path.join(
                    'static',
                    'locales',
                    code,
                    'how',
                    filename,
                );
                if (!fs.existsSync(target)) continue;
                const localized = fs.readFileSync(target, 'utf8');
                const result = retargetExamplesIn(
                    fs.readFileSync(path.join(englishDir, filename), 'utf8'),
                    localized,
                    locale,
                );
                if (result.text !== localized)
                    stale.push(`${code}/${filename}`);
            }
        }
        expect(
            stale,
            'Run "npm run locales-fix" to retarget these examples.',
        ).toEqual([]);
    },
    Timeout,
);

/**
 * The three tests above ask whether the repair *would rewrite* an example — the fixable case.
 * An example whose shape no longer matches en-US is the other half, and it is invisible to
 * them: the pass reports it and writes nothing, so 89 warnings covering ~1,000 examples
 * accumulated without a red test. Every one turned out to be repairable — an en-US typo every
 * locale had copied, foreign source code that had been machine translated, a paragraph split
 * through the middle of an example, a `%` that lost the space making it an operator — so the
 * count is zero and this keeps it there.
 */
test(
    'no localized example has drifted out of shape with its en-US source',
    () => {
        expect(English).toBeDefined();
        if (English === undefined) return;
        const englishDir = path.join('static', 'locales', 'en-US', 'how');
        const howTos = fs
            .readdirSync(englishDir)
            .filter((name) => name.endsWith('.txt'));
        const divergent: string[] = [];
        for (const code of Locales) {
            const locale: LocaleText | undefined = read(getLocalePath(code));
            if (locale === undefined) continue;

            for (const pair of getCheckableLocalePairs(locale)) {
                const source = pair.resolve(English);
                if (source === undefined) continue;
                const items =
                    typeof pair.value === 'string' ? [pair.value] : pair.value;
                if (!items.some((item) => item.includes('\\'))) continue;
                const result = retargetExamplesInDocument(
                    typeof source === 'string' ? [source] : source,
                    items,
                    locale,
                );
                if (result.divergent > 0)
                    divergent.push(
                        `${code} ${pair.toString()}: ${result.divergent}`,
                    );
            }

            for (const mode of TutorialModes) {
                const tutorial: Tutorial | undefined = read(
                    getTutorialPath(code, mode),
                );
                if (tutorial === undefined) continue;
                const tally = retargetTutorialExamples(
                    tutorial,
                    getDefaultTutorial(mode),
                    locale,
                    false,
                );
                if (tally.divergent > 0)
                    divergent.push(`${code} ${mode}: ${tally.divergent}`);
            }

            for (const filename of howTos) {
                const target = path.join(
                    'static',
                    'locales',
                    code,
                    'how',
                    filename,
                );
                if (!fs.existsSync(target)) continue;
                const result = retargetExamplesIn(
                    fs.readFileSync(path.join(englishDir, filename), 'utf8'),
                    fs.readFileSync(target, 'utf8'),
                    locale,
                );
                if (result.divergent > 0)
                    divergent.push(`${code}/${filename}: ${result.divergent}`);
            }
        }
        expect(
            divergent,
            'These examples no longer have the same shape as en-US, so their names cannot be retargeted. Compare each against its en-US source and repair it by hand.',
        ).toEqual([]);
    },
    Timeout,
);
