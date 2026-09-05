import { Languages } from '@locale/LanguageCode';
import { RegionNames } from '@locale/regionNames.generated';
import { isRegionCode, RegionCodes, Regions } from '@locale/Regions';
import {
    completeLanguageTag,
    completeRegionTag,
    foldTagName,
    MaxTagCompletions,
    getLanguageNameIndex,
    getRegionNameIndex,
    getRegionName,
    resolveLanguageCode,
    resolveRegionCode,
} from '@locale/tagNames';
import { describe, expect, test } from 'vitest';

describe('folding a written name', () => {
    test.each([
        ['Español', 'espanol'],
        ['español', 'espanol'],
        ['ESPAÑOL', 'espanol'],
        ['Espanol', 'espanol'],
        ['Bahasa Indonesia', 'bahasaindonesia'],
        ["Côte d'Ivoire", 'cotedivoire'],
        ['Bolivia, Plurinational State of', 'boliviaplurinationalstateof'],
        ['Guinea-Bissau', 'guineabissau'],
        ['日本語', '日本語'],
        ['한국어', '한국어'],
        // Nothing but a symbol folds to nothing, which never indexes.
        ['😀', ''],
        ['', ''],
    ])('%s folds to %s', (text, folded) => {
        expect(foldTagName(text)).toBe(folded);
    });

    test('composed and decomposed spellings fold alike', () => {
        expect(foldTagName('Español'.normalize('NFD'))).toBe(
            foldTagName('Español'.normalize('NFC')),
        );
    });

    test('folding is locale-independent', () => {
        // The reader's locale must not change what a program means, so `I`
        // folds to ASCII `i` even for a reader whose language says otherwise
        // (Turkish would give `ı`). See casing.ts for the same rule.
        expect(foldTagName('I')).toBe('i');
        expect(foldTagName('İ')).toBe('i');
    });
});

describe('resolving a language', () => {
    test.each([
        // Codes, including case-insensitively.
        ['es', 'es'],
        ['EN', 'en'],
        ['😀', '😀'],
        // Names in the language's own language.
        ['Español', 'es'],
        ['español', 'es'],
        ['Espanol', 'es'],
        ['日本語', 'ja'],
        ['한국어', 'ko'],
        ['Türkçe', 'tr'],
        ['Turkce', 'tr'],
        // Names in English.
        ['Spanish', 'es'],
        ['Japanese', 'ja'],
        ['Emoji', '😀'],
        // A name whose spaces can't be typed inside a tag still resolves
        // without them, which is the only form a tag can carry.
        ['BahasaIndonesia', 'id'],
        // Either script of a name written with both.
        ['bosanski', 'bs'],
        ['босански', 'bs'],
        ['srpski', 'sr'],
        ['српски', 'sr'],
    ])('/%s is %s', (text, code) => {
        expect(resolveLanguageCode(text)).toBe(code);
    });

    test.each(['Klingon', 'aaa', '', '   '])('/%s names nothing', (text) => {
        expect(resolveLanguageCode(text)).toBeUndefined();
    });

    test.each([
        // Sichuan Yi's name, Ho's name, and Lü's name each fold onto a
        // different language's code. The code is the older, unambiguous
        // spelling, so it wins — and the shadowed language keeps its own code.
        ['yi', 'yi', 'ii'],
        ['ho', 'ho', 'hoc'],
        ['lu', 'lu', 'khb'],
    ])('/%s is the code %s, not the name of %s', (text, code, shadowed) => {
        expect(resolveLanguageCode(text)).toBe(code);
        expect(resolveLanguageCode(shadowed)).toBe(shadowed);
    });
});

describe('resolving a region', () => {
    test.each([
        ['MX', 'MX'],
        ['us', 'US'],
        ['México', 'MX'],
        ['mexico', 'MX'],
        ['Mexico', 'MX'],
        ['UnitedStates', 'US'],
        ['USA', 'US'],
        ['UnitedKingdom', 'GB'],
        ['UK', 'GB'],
        ['SouthKorea', 'KR'],
        ['CotedIvoire', 'CI'],
        ['IvoryCoast', 'CI'],
        // ISO spells this "Bolivia, Plurinational State of"; CLDR's shorter
        // English name is what someone would actually type.
        ['Bolivia', 'BO'],
        ['België', 'BE'],
        ['日本', 'JP'],
    ])('-%s is %s', (text, code) => {
        expect(resolveRegionCode(text)).toBe(code);
    });

    test.each(['Merica', 'Atlantis', ''])('-%s names nothing', (text) => {
        expect(resolveRegionCode(text)).toBeUndefined();
    });

    // Kosovo has no official ISO 3166-1 code; XK is the user-assigned one CLDR
    // and BCP 47 use, and three of our languages name it as a region.
    test('Kosovo is nameable, though its code is user-assigned', () => {
        expect(resolveRegionCode('XK')).toBe('XK');
        expect(resolveRegionCode('Kosovo')).toBe('XK');
        expect(getRegionName('XK')).toBe('Kosov\u00eb');
    });

    // `in` answers true for inherited keys, so these used to resolve to
    // themselves and `getRegionName('constructor')` returned "Object".
    test.each(['constructor', 'toString', '__proto__', 'valueOf'])(
        '%s is a property of Object, not a code',
        (text) => {
            expect(resolveRegionCode(text)).toBeUndefined();
            expect(resolveLanguageCode(text)).toBeUndefined();
        },
    );
});

describe('the name indexes stay unambiguous', () => {
    // These are the tests that fail when a language or region is added whose
    // name collides with an existing one. A collision is not a bug to work
    // around here — it means two entries would answer to one spelling, and
    // whichever loses becomes unwritable by name.

    test('no folded language name names two languages', () => {
        const index = getLanguageNameIndex();
        const claimed = new Map<string, string>();
        for (const [code, metadata] of Object.entries(Languages))
            for (const name of [metadata.name, metadata.en])
                for (const alias of name.split('/')) {
                    const key = foldTagName(alias);
                    if (key.length === 0) continue;
                    // A name folding onto some *other* language's code is
                    // deliberately not indexed, so skip those.
                    if (key !== code && key in Languages) continue;
                    const prior = claimed.get(key);
                    expect(
                        prior === undefined || prior === code,
                        `"${alias}" names both ${prior} and ${code}`,
                    ).toBe(true);
                    claimed.set(key, code);
                    expect(index.get(key)).toBe(code);
                }
    });

    test('no folded region name names two regions', () => {
        const index = getRegionNameIndex();
        const claimed = new Map<string, string>();
        for (const code of RegionCodes) {
            const data = RegionNames[code];
            const names = [
                Regions[code].en,
                data?.name,
                data?.en,
                ...(data?.alt ?? []),
            ].filter((name): name is string => name !== undefined);
            for (const name of names)
                for (const alias of name.split('/')) {
                    const key = foldTagName(alias);
                    if (key.length === 0) continue;
                    if (
                        key.toUpperCase() !== code &&
                        isRegionCode(key.toUpperCase())
                    )
                        continue;
                    const prior = claimed.get(key);
                    expect(
                        prior === undefined || prior === code,
                        `"${alias}" names both ${prior} and ${code}`,
                    ).toBe(true);
                    claimed.set(key, code);
                    expect(index.get(key)).toBe(code);
                }
        }
    });

    /** Ho's only name, in its own language and in English alike, is "Ho" —
     *  which is Hiri Motu's code, and a code always wins. So Ho is the one
     *  language that can only be written as `/hoc`. Listed rather than
     *  tolerated: if this set grows, a language quietly became unwritable by
     *  name and someone should decide whether that is acceptable. */
    const UnwritableByName = new Set(['hoc']);

    test('every language is reachable by one of its names', () => {
        const unreachable = Object.entries(Languages)
            .filter(
                ([code, metadata]) =>
                    ![...metadata.name.split('/'), ...metadata.en.split('/')]
                        .map(resolveLanguageCode)
                        .some((resolved) => resolved === code),
            )
            .map(([code]) => code);
        expect(new Set(unreachable)).toEqual(UnwritableByName);
    });

    test('every region is reachable by its own name', () => {
        for (const code of RegionCodes)
            expect(
                resolveRegionCode(getRegionName(code)),
                `${code} is unreachable by its own name`,
            ).toBe(code);
    });
});

describe('completing a partly-typed tag', () => {
    test.each([
        // An exact code wins outright.
        ['en', 'en', 'en'],
        // A code prefix completes to the code.
        ['e', 'en', 'en'],
        // An English name completes to the English name...
        ['span', 'Spanish', 'es'],
        ['japan', 'Japanese', 'ja'],
        // ...and a language's own name to its own name, in the spelling the
        // catalogue stores (lower case for Spanish).
        ['esp', 'español', 'es'],
        // A language Wordplay ships no content for is still reachable, which is
        // the point of widening once something is typed.
        ['swa', 'Swahili', 'sw'],
        // Accents are optional on the way in, and supplied on the way out.
        ['turk', 'Turkish', 'tr'],
    ])('/%s offers %s', (prefix, text, code) => {
        expect(completeLanguageTag(prefix)).toContainEqual({ text, code });
    });

    test.each([
        ['U', 'US', 'US'],
        ['mex', 'Mexico', 'MX'],
        // An accented prefix picks the accented name over the English one,
        // because it is what the reader was actually typing.
        ['méx', 'México', 'MX'],
        ['ken', 'Kenya', 'KE'],
        // Punctuation is dropped from the spelling, since a tag is one token.
        ['cote', 'CôtedIvoire', 'CI'],
    ])('-%s offers %s', (prefix, text, code) => {
        expect(completeRegionTag(prefix)).toContainEqual({ text, code });
    });

    test('an empty prefix completes nothing', () => {
        // Callers with nothing typed want the shipped locales, not all 262.
        expect(completeLanguageTag('')).toEqual([]);
        expect(completeRegionTag('  ')).toEqual([]);
    });

    test('a completion always means what it says', () => {
        // The guard that matters most: `getLanguageNameIndex` refuses to index a
        // name whose folded key belongs to another language's code, so offering
        // Sichuan Yi's name "Yi" would insert a tag meaning Yiddish.
        for (const prefix of ['a', 'y', 'yi', 'ho', 'lu', 'si', 'e', 'n', 'ma'])
            for (const { text, code } of completeLanguageTag(prefix))
                expect(
                    resolveLanguageCode(text),
                    `"${text}" was offered for ${code}`,
                ).toBe(code);
        for (const prefix of ['a', 'u', 'co', 'b', 'sa'])
            for (const { text, code } of completeRegionTag(prefix))
                expect(
                    resolveRegionCode(text),
                    `"${text}" was offered for ${code}`,
                ).toBe(code);
    });

    test('a name that cannot be typed in a tag is never offered', () => {
        // `ø` is a reserved symbol and also a letter, so it survives folding but
        // splits the name token. Faroese and the two ø-bearing regions are the
        // whole catalogue's worth of this; their English names still work.
        expect(completeLanguageTag('før')).toEqual([]);
        expect(completeLanguageTag('faro')).toContainEqual({
            text: 'Faroese',
            code: 'fo',
        });
        expect(completeRegionTag('bouv').map(({ text }) => text)).not.toContain(
            'Bouvetøya',
        );
    });

    test('a broad prefix stays a readable menu', () => {
        expect(completeLanguageTag('a').length).toBeLessThanOrEqual(
            MaxTagCompletions,
        );
        expect(completeRegionTag('a').length).toBeLessThanOrEqual(
            MaxTagCompletions,
        );
    });
});
