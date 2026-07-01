import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import { formatNumberForLocale } from '@locale/numberFormats';
import { expect, test } from 'vitest';

/** Region is irrelevant to formatting (keyed off language + script), so tests
 *  use empty regions. */
function locale(language: LanguageCode): Locale {
    return { language, regions: [] };
}

test.each<[string, LanguageCode, string]>([
    // [numeric string, language, expected]

    // Western default (English): comma grouping, dot decimal.
    ['1000000.5', 'en', '1,000,000.5'],
    ['1234', 'en', '1,234'],
    ['999', 'en', '999'],
    ['-1234567', 'en', '-1,234,567'],
    ['0', 'en', '0'],

    // German: dot grouping, comma decimal.
    ['1000000.5', 'de', '1.000.000,5'],

    // French: space grouping, comma decimal.
    ['1000000.5', 'fr', '1 000 000,5'],

    // Devanagari (Hindi): Indian grouping + native digits.
    ['1000000.5', 'hi', '१०,००,०००.५'],
    ['1234', 'hi', '१,२३४'],
    ['100', 'hi', '१००'],

    // Other native scripts (Indian grouping).
    ['1234', 'bn', '১,২৩৪'], // Bengali
    ['1234', 'ta', '௧,௨௩௪'], // Tamil
    ['1234', 'te', '౧,౨౩౪'], // Telugu

    // Arabic and CJK fall back to Latin digits (with locale separators).
    ['1000000.5', 'ar', '1,000,000.5'],
    ['1000000.5', 'ja', '1,000,000.5'],
    ['1000000.5', 'zh', '1,000,000.5'],
])('formatNumberForLocale(%s, %s) = %s', (numeric, language, expected) => {
    expect(formatNumberForLocale(numeric, locale(language))).toBe(expected);
});
