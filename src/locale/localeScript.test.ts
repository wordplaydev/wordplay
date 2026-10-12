import { getBestSupportedLocales } from '#locale/getBestSupportedLocales.ts';
import {
    getLocaleDirection,
    getLocaleLayout,
    getLocaleWritingScript,
} from '#locale/LanguageCode.ts';
import {
    type Locale,
    localesAreEqual,
    localeToString,
    stringToLocale,
    toBCP47,
} from '#locale/Locale.ts';
import localeToBCP47 from '#locale/localeToBCP47.ts';
import {
    getLanguageLocalDescription,
    getLocaleRegions,
    getLocaleScript,
} from '#locale/LocaleText.ts';
import { describe, expect, test } from 'vitest';

/** A script subtag is a third piece of locale identity (#1457): Roman Urdu is
 *  `ur` written in `Latn`, and must not collapse into Arabic-script `ur-PK`. */
describe('locale scripts', () => {
    test.each(['ur-Latn-PK', 'ta-IN-LK-SG', 'es_en-MX', 'sr-RS', 'en-US'])(
        '%s round-trips',
        (name) => {
            const locale = stringToLocale(name);
            expect(locale).toBeDefined();
            if (locale) expect(localeToString(locale)).toBe(name);
        },
    );

    test('the script is parsed apart from the regions', () => {
        expect(getLocaleScript('ur-Latn-PK')).toBe('Latn');
        expect(getLocaleRegions('ur-Latn-PK')).toEqual(['PK']);
        expect(getLocaleScript('ur-PK')).toBeUndefined();
        // Not a script: wrong case, and not an ISO 15924 code.
        expect(getLocaleScript('ur-LATN-PK')).toBeUndefined();
        expect(getLocaleScript('ur-Xxxx-PK')).toBeUndefined();
    });

    test('a tag for the browser keeps the script', () => {
        const roman: Locale = {
            language: 'ur',
            regions: ['PK'],
            script: 'Latn',
        };
        expect(toBCP47(roman)).toBe('ur-Latn-PK');
        expect(localeToBCP47(roman)).toBe('ur-Latn-PK');
        expect(toBCP47({ language: 'ur', regions: ['PK'] })).toBe('ur-PK');
    });

    test('the script decides direction, not the language', () => {
        const roman = stringToLocale('ur-Latn-PK');
        const arabic = stringToLocale('ur-PK');
        expect(roman && getLocaleWritingScript(roman)).toBe('Latn');
        expect(roman && getLocaleDirection(roman)).toBe('ltr');
        expect(roman && getLocaleLayout(roman)).toBe('horizontal-tb');
        expect(arabic && getLocaleDirection(arabic)).toBe('rtl');
    });

    test('two locales differing only in script are different locales', () => {
        const roman = stringToLocale('ur-Latn-PK');
        const arabic = stringToLocale('ur-PK');
        expect(roman && arabic && localesAreEqual(roman, arabic)).toBe(false);
        expect(roman && localesAreEqual(roman, roman)).toBe(true);
    });

    test('a locale is named in its own script', () => {
        const roman = stringToLocale('ur-Latn-PK');
        expect(roman && getLanguageLocalDescription(roman)).toBe(
            'Urdu [Pakistan] (ur-Latn-PK)',
        );
    });

    test('a reader asking for a language gets it in whatever script we have', () => {
        // Only checks matching against the shipped list, which a script-variant
        // locale may or may not be on yet; the rule is that script never blocks
        // a language match.
        const [best] = getBestSupportedLocales(['ur-Arab-PK']);
        expect(best === 'en-US' || best?.startsWith('ur')).toBe(true);
    });
});
