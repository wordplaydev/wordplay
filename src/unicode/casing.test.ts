import { expect, test } from 'vitest';
import { lowerCase, toCasingLocale, upperCase } from '@unicode/casing';

test.each([
    // Turkish dotted/dotless i, the canonical locale-sensitive case.
    ['I', 'tr', 'ı'],
    ['İ', 'tr', 'i'],
    // The root mapping keeps the combining dot, and never applies Turkic rules.
    ['I', undefined, 'i'],
    ['İ', undefined, 'i̇'],
    ['I', 'en-US', 'i'],
    // Greek final sigma is positional.
    ['ΟΔΟΣ', undefined, 'οδος'],
    // Scripts without case, and emoji, are unchanged.
    ['日本語', undefined, '日本語'],
    ['🐈📚', undefined, '🐈📚'],
])('lowerCase(%s, %s) is %s', (text, tag, expected) => {
    expect(lowerCase(text, tag)).toBe(expected);
});

test.each([
    ['i', 'tr', 'İ'],
    ['i', undefined, 'I'],
    // Uppercasing can lengthen text; that is the standard's answer, not ours.
    ['straße', undefined, 'STRASSE'],
    ['ﬁn', undefined, 'FIN'],
    ['日本語', undefined, '日本語'],
])('upperCase(%s, %s) is %s', (text, tag, expected) => {
    expect(upperCase(text, tag)).toBe(expected);
});

// A tag Intl rejects must degrade to the root mapping rather than throw. The
// multilingual form is the one creators actually reach: `/es_en` is a valid
// Wordplay locale tag and not a valid BCP-47 one.
test.each(['es_en', 'a', 'foo-BAR', 'en_US-US', ''])(
    'the unusable tag %s falls back to root casing',
    (tag) => {
        expect(toCasingLocale(tag)).toBeUndefined();
        expect(lowerCase('I', tag)).toBe('i');
        expect(upperCase('i', tag)).toBe('I');
    },
);

test('a usable tag is canonicalized and cached', () => {
    expect(toCasingLocale('TR')).toBe('tr');
    expect(toCasingLocale('TR')).toBe('tr');
    expect(toCasingLocale('en-us')).toBe('en-US');
});
