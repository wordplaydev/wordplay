import { RegionNames, RegionNamesCLDR } from '@locale/regionNames.generated';
import { Regions } from '@locale/Regions';
import { CLDR_VERSION } from '@util/verify-locales/cldr';
import { rankRegionLanguages } from '@util/verify-locales/generateRegionNames';
import { describe, expect, test } from 'vitest';

/** Guards the committed artifact `npm run regions` writes. It reads what is on
 *  disk rather than regenerating — generation fetches CLDR, and the `unit /
 *  locales` CI job runs `npm ci` with no network budget for it — so what this
 *  can check is coverage, provenance, and the choices worth pinning. */
describe('the committed region names', () => {
    test('came from the CLDR release cldr.ts pins', () => {
        expect(RegionNamesCLDR).toBe(CLDR_VERSION);
    });

    test('cover exactly the regions Regions.ts declares', () => {
        expect(Object.keys(RegionNames).sort()).toEqual(
            Object.keys(Regions).sort(),
        );
    });

    test('every region has a name, a naming language, and an English name', () => {
        for (const [code, data] of Object.entries(RegionNames)) {
            expect(data.name.length, `${code} has no name`).toBeGreaterThan(0);
            expect(
                data.language.length,
                `${code} records no naming language`,
            ).toBeGreaterThan(0);
            expect(
                data.en.length,
                `${code} has no English name`,
            ).toBeGreaterThan(0);
        }
    });

    test.each([
        // Ranking by population share alone picks English for these three,
        // because CLDR's shares count second-language speakers. Official
        // languages come first, which is what makes them right.
        ['BE', 'België', 'nl'],
        ['ET', 'ኢትዮጵያ', 'am'],
        ['CH', 'Schweiz', 'de'],
        // And `de_facto_official` has to count, or Mexico and the USA — whose
        // languages are official by nothing but practice — fall through.
        ['MX', 'México', 'es'],
        ['US', 'United States', 'en'],
        ['JP', '日本', 'ja'],
        ['DE', 'Deutschland', 'de'],
        ['IN', 'भारत', 'hi'],
    ])('%s is named %s in %s', (code, name, language) => {
        expect(RegionNames[code]).toMatchObject({ name, language });
    });

    test('CLDR English names and alternates are carried, since ISO ones are unwritable', () => {
        // ISO calls this "Bolivia, Plurinational State of".
        expect(RegionNames.BO.en).toBe('Bolivia');
        expect(RegionNames.GB.alt).toContain('UK');
        expect(RegionNames.US.alt).toContain('US');
        expect(RegionNames.CI.alt).toContain('Ivory Coast');
    });
});

describe('choosing the language that names a region', () => {
    test('an official language beats a more widely spoken one', () => {
        expect(
            rankRegionLanguages({
                nl: { _populationPercent: '55', _officialStatus: 'official' },
                en: { _populationPercent: '90' },
            })[0].id,
        ).toBe('nl');
    });

    test('de facto official counts as official', () => {
        expect(
            rankRegionLanguages({
                es: {
                    _populationPercent: '90',
                    _officialStatus: 'de_facto_official',
                },
                en: { _populationPercent: '95' },
            })[0].id,
        ).toBe('es');
    });

    test('a language official in one region only does not name the country', () => {
        expect(
            rankRegionLanguages({
                en: { _populationPercent: '90' },
                haw: {
                    _populationPercent: '0.01',
                    _officialStatus: 'official_regional',
                },
            })[0].id,
        ).toBe('en');
    });

    test('with nothing official, the most spoken language names it', () => {
        expect(
            rankRegionLanguages({
                a: { _populationPercent: '10' },
                b: { _populationPercent: '80' },
            })[0].id,
        ).toBe('b');
    });

    test("CLDR's unknown-language placeholder is not a language", () => {
        expect(
            rankRegionLanguages({
                und: { _populationPercent: '99' },
                fr: { _populationPercent: '1' },
            }).map((l) => l.id),
        ).toEqual(['fr']);
    });

    test('ties break by id, so the artifact never depends on key order', () => {
        expect(
            rankRegionLanguages({
                zz: { _populationPercent: '50' },
                aa: { _populationPercent: '50' },
            }).map((l) => l.id),
        ).toEqual(['aa', 'zz']);
    });

    test('a region with no language data ranks nothing', () => {
        expect(rankRegionLanguages(undefined)).toEqual([]);
    });
});
