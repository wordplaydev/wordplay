import type LocaleText from '@locale/LocaleText';
import { sweepSkipsLocaleText } from '@util/verify-locales/exampleFreshness';
import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';
import { TourKeys, tourExampleProblems } from './tourExamples';

/**
 * @sweep static/locales The nine landing-page tour examples in each of the 30
 * translated locales — ~17s of parsing and analysis whose answer no source edit
 * changes, only a translation does.
 *
 * The check is `tourExampleProblems`, which Showcase.test.ts also runs over en-US
 * in the default suite; this file only widens it across the corpus. It runs in the
 * `sweep` project (src/util/sweepTests.ts), so `npm run test:run` doesn't pay for
 * it — the pre-commit hook runs it when static/locales is staged, and the `sweep`
 * CI job runs it whole.
 */

/** Every translated locale on disk. en-US is `DefaultLocale`, not a file here. */
function translatedLocales(): { name: string; locale: LocaleText }[] {
    const locales: { name: string; locale: LocaleText }[] = [];
    const dir = path.join('static', 'locales');
    for (const name of fs.readdirSync(dir)) {
        if (name === 'en-US') continue;
        const file = path.join(dir, name, `${name}.json`);
        if (!fs.existsSync(file)) continue;
        locales.push({
            name,
            locale: JSON.parse(fs.readFileSync(file, 'utf8')) as LocaleText,
        });
    }
    return locales;
}

describe.each(translatedLocales())(
    '$name tour examples',
    ({ name, locale }) => {
        test.each(TourKeys)('%s compiles', (key) => {
            // Under the pre-commit hook only; CI runs every locale. See sweepSkipsLocaleText.
            if (sweepSkipsLocaleText(name)) return;
            expect(tourExampleProblems(locale, key)).toEqual([]);
        });
    },
);
