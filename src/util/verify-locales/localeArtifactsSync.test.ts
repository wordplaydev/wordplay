import type LocaleText from '@locale/LocaleText';
import { buildHowToBundle } from '@util/verify-locales/buildHowTos';
import generateChoosePrompts from '@util/verify-locales/generateChoosePrompts';
import generateManifests from '@util/verify-locales/generateManifests';
import generateNameIndex from '@util/verify-locales/generateNameIndex';
import { allBundleIds } from '@locale/UpdatesBundle';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import {
    readStructuralBundle,
    readTranslations,
    updatesFilePath,
} from '@util/verify-locales/verifyChangelog';
import { collectingLog } from '@util/verify-locales/Log';
import { sweepSkipsAllLocaleText } from '@util/verify-locales/exampleFreshness';
import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

/**
 * @sweep static/locales Regenerates every locale's name index, how-to bundle,
 * choose-prompts and web manifest in memory and compares — a basis per locale is
 * the slow part. ~12s, and only a locale edit changes the answer. Runs in the
 * `sweep` project (see src/util/sweepTests.ts), not in `npm run test:run`.
 *
 * Drift detection for the locale artifacts that are generated rather than
 * written, sharing its checks with the `npm run locales` CLI the way
 * fontsSync.test.ts shares scripts/fonts/verify.ts.
 *
 * Both artifacts hard-fail `npm run locales`, but nothing regenerated them
 * before now: the pre-commit hook only runs prettier, and the `unit / locales`
 * CI job runs `npm ci` without a build, so `npm run how` never fires there.
 * That left a rename in a locale file discoverable only after a push — which is
 * how a Spanish improvement landed with a stale names.json and blocked a deploy.
 *
 * Every check below passes `write: false`, which makes writeFormatted report
 * whether the file *would* change without touching it, so this stays read-only.
 */

/** The locale directories, which is what both generators enumerate. */
const Locales = fs
    .readdirSync(path.join('static', 'locales'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

/** Building a basis per locale to collect its names is the slow part, and there
 *  is no cheaper way to know the index is current. */
const BuildTimeout = 60_000;

/* These artifacts are each rebuilt from EVERY locale at once — names.json is one
   file naming them all — so unlike the other sweeps there is no per-locale
   narrowing to do. Either some locale changed and the whole rebuild runs, or none
   did and none of it needs to. Under the pre-commit hook only; CI runs it whole. */
const Skip = sweepSkipsAllLocaleText(Locales);

test(
    'static/locales/names.json matches the names the locales bind',
    async () => {
        if (Skip) return;
        const { log, lines } = collectingLog();
        // JSON.parse gives `any`, so this needs no assertion; getLocalePath is
        // what knows en-US lives in src/locale rather than static/locales.
        const locales: LocaleText[] = Locales.map((locale) =>
            JSON.parse(fs.readFileSync(getLocalePath(locale), 'utf8')),
        );

        const drifted = await generateNameIndex(log, locales, false);

        // Both assertions matter: a locale whose basis can't be built is
        // reported by logging and returning false, which alone reads as "no
        // drift".
        expect(log.errorCount, lines.join('\n')).toBe(0);
        expect(
            drifted,
            'run `npm run locales-fix` and commit static/locales/names.json',
        ).toBe(false);
    },
    BuildTimeout,
);

test(
    'every locale’s how-to bundle matches its how/*.txt sources',
    async () => {
        if (Skip) return;
        const { log, lines } = collectingLog();

        // No locale text, so this asks only whether the bundle is current;
        // judging the examples inside it belongs to `npm run locales`, which
        // has the locale's own basis to judge them against.
        for (const locale of Locales)
            await buildHowToBundle(log, locale, false);

        expect(
            log.errorCount,
            `${lines.join('\n')}\n\nrun \`npm run locales-fix\` (or \`npm run how\`) and commit the bundles`,
        ).toBe(0);
    },
    BuildTimeout,
);

test('src/locale/choosePrompts.generated.ts matches the locales’ phrases', async () => {
    if (Skip) return;
    const { log, lines } = collectingLog();
    const locales: LocaleText[] = Locales.map((locale) =>
        JSON.parse(fs.readFileSync(getLocalePath(locale), 'utf8')),
    );

    const drifted = await generateChoosePrompts(log, locales, false);

    expect(log.errorCount, lines.join('\n')).toBe(0);
    expect(
        drifted,
        'run `npm run locales-fix` and commit src/locale/choosePrompts.generated.ts',
    ).toBe(false);
});

test('static/manifests matches the locales’ names and directions', async () => {
    if (Skip) return;
    const { log, lines } = collectingLog();
    const locales: LocaleText[] = Locales.map((locale) =>
        JSON.parse(fs.readFileSync(getLocalePath(locale), 'utf8')),
    );

    const drifted = await generateManifests(log, locales, false);

    expect(log.errorCount, lines.join('\n')).toBe(0);
    expect(
        drifted,
        'run `npm run locales-fix` and commit static/manifests',
    ).toBe(false);
});

test("every locale's changelog translations are readable and current", () => {
    // A bundle that fails to parse, or that is at an older format, makes
    // `readTranslations` return nothing — and the page then renders that whole
    // locale's updates in English with no error anywhere. Silent, and expensive
    // to rediscover, since the fix is to re-buy the translations.
    const bundle = readStructuralBundle();
    expect(
        bundle,
        'static/updates.json is missing. Run "npm run updates".',
    ).toBeDefined();
    const live = allBundleIds(bundle!);

    for (const locale of Locales) {
        const file = updatesFilePath(locale);
        if (!fs.existsSync(file)) continue;

        const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
            format?: number;
            entries?: Record<string, string>;
        };
        expect(
            Object.keys(readTranslations(locale)).length,
            `${file} parsed as empty — it is at format ${String(raw.format)}, which the app no longer reads, so ${locale} would silently render in English.`,
        ).toBe(Object.keys(raw.entries ?? {}).length);

        // An entry edited after release gets a new id, orphaning the old one.
        // Harmless to render but pure weight, and a sign the bundle drifted.
        const orphans = Object.keys(raw.entries ?? {}).filter(
            (id) => !live.has(id),
        );
        expect(
            orphans,
            `${file} has translations for entries that no longer exist. Run "npm run locales-fix" to drop them.`,
        ).toEqual([]);
    }
});
