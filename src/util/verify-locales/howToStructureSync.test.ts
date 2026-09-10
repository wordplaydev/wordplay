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
    CoverageExemptions,
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
                locale,
            ),
        ).toEqual([]);
    },
    30_000,
);

/**
 * Every exemption names a file that is really behind, so the list shrinks as they
 * are repaired instead of outliving them — the failure mode a hand-maintained
 * allowlist otherwise has.
 */
test('no exemption outlives the defect it was written for', () => {
    const stale = CoverageExemptions.filter((entry) => {
        const [locale, id] = entry.split('/');
        return (
            howTosBehindEnglish(
                EnglishDir,
                path.join(LocalesDir, locale, 'how'),
                [`${id}.txt`],
            ).length === 0
        );
    });
    expect(stale).toEqual([]);
}, 60_000);
