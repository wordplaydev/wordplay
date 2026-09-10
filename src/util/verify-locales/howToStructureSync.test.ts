/**
 * Every locale's how-tos cover everything their en-US source says.
 *
 * @sweep static/locales Parses all 37 how-tos in all 31 locales and pairs each
 * against its en-US source, so its cost is the corpus rather than the code.
 *
 * This is the check the how-to pipeline never had. `checkHowToBody` reads en-US's
 * example shapes but, when the counts disagree, silently falls back to the
 * target's own — so a translation missing half its paragraphs was invisible to
 * every gate. `move-between-content` shipped at ~50% of its English in 28 locales
 * for months, and two how-tos shipped without the examples #547 added, because
 * `+howto:` re-translated the target's structure rather than English's (#1365).
 *
 * Uncovered content is content a reader of that language cannot see at all, so
 * this is meant to be fatal, the same call `exampleNamesSync.test.ts` makes
 * about a divergent example. It is gated on `HowToCoverageIsFatal` only because
 * the corpus is still the output of the pipeline this change fixes: every locale
 * is behind until one translation run clears it. Flipping that flag turns this
 * on, and nothing else has to change.
 */
import { HowToIDs } from '@concepts/HowTo';
import {
    HowToCoverageIsFatal,
    howTosBehindEnglish,
} from '@util/verify-locales/verifyHowTo';
import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

const LocalesDir = path.join('static', 'locales');
const EnglishDir = path.join(LocalesDir, 'en-US', 'how');

const Filenames = HowToIDs.map((id) => `${id}.txt`).filter((filename) =>
    fs.existsSync(path.join(EnglishDir, filename)),
);

const Locales = fs
    .readdirSync(LocalesDir)
    .filter(
        (locale) =>
            locale !== 'en-US' &&
            fs.existsSync(path.join(LocalesDir, locale, 'how')),
    );

test.skipIf(!HowToCoverageIsFatal).each(Locales)(
    "%s's how-tos say everything en-US's do",
    (locale) => {
        expect(
            howTosBehindEnglish(
                EnglishDir,
                path.join(LocalesDir, locale, 'how'),
                Filenames,
            ),
        ).toEqual([]);
    },
    30_000,
);

/**
 * What the gate above would say today, so the backlog is a number in the suite
 * rather than a claim in a comment — and so this file still exercises the
 * pairing over the whole corpus while the flag is off.
 */
test('the how-to coverage backlog is measured, not assumed', () => {
    const behind = Locales.flatMap((locale) =>
        howTosBehindEnglish(
            EnglishDir,
            path.join(LocalesDir, locale, 'how'),
            Filenames,
        ).map((id) => `${locale}/${id}`),
    );
    // Every locale is behind on most how-tos, because until now a translation
    // could never gain a paragraph. One translation run clears this.
    if (HowToCoverageIsFatal) expect(behind).toEqual([]);
    else expect(behind.length).toBeGreaterThan(0);
}, 60_000);
