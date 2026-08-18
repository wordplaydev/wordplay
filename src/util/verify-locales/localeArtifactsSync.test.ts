import type LocaleText from '@locale/LocaleText';
import { buildHowToBundle } from '@util/verify-locales/buildHowTos';
import generateChoosePrompts from '@util/verify-locales/generateChoosePrompts';
import generateNameIndex from '@util/verify-locales/generateNameIndex';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import { collectingLog } from '@util/verify-locales/Log';
import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

/**
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

test(
    'static/locales/names.json matches the names the locales bind',
    async () => {
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
