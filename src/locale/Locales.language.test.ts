import { Unwritten } from '@locale/Annotations';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import type LanguageCode from '@locale/LanguageCode';
import type LocaleText from '@locale/LocaleText';
import Locales from '@locale/Locales';
import type { RegionCode } from '@locale/Regions';
import { describe, expect, test } from 'vitest';

/** A locale like en-US in another language, with `glossary.start.word` set. */
function localeWith(
    language: LanguageCode,
    regions: RegionCode[],
    start: string,
): LocaleText {
    return {
        ...DefaultLocale,
        language,
        regions,
        glossary: {
            ...DefaultLocale.glossary,
            start: { ...DefaultLocale.glossary.start, word: start },
        },
    };
}

const es = localeWith('es', ['MX'], 'empezar');
const esUnwritten = localeWith('es', ['MX'], Unwritten);
const ar = localeWith('ar', ['SA'], 'ابدأ');
const koUnwritten = localeWith('ko', ['KR'], Unwritten);

function locales(...preferred: LocaleText[]) {
    return new Locales(concretize, preferred, DefaultLocale);
}

const start = (l: LocaleText) => l.glossary.start.word;

describe('getLocaleOf', () => {
    test('is the primary locale when it has written the string', () => {
        expect(locales(es).getLocaleOf(start).language).toBe('es');
    });

    test('is the next preferred locale that has written it', () => {
        expect(locales(esUnwritten, ar).getLocaleOf(start).language).toBe('ar');
    });

    test('is the fallback locale when no preferred locale has', () => {
        expect(
            locales(esUnwritten, koUnwritten).getLocaleOf(start).language,
        ).toBe('en');
    });
});

describe('getLanguageAttributes', () => {
    test('adds nothing when the text is in the primary locale', () => {
        expect(locales(es).getLanguageAttributes(start)).toBeUndefined();
    });

    test('tags untranslated text with the fallback language', () => {
        expect(locales(esUnwritten).getLanguageAttributes(start)).toEqual({
            lang: 'en-US',
            dir: 'ltr',
        });
    });

    test('carries the answering locale’s direction', () => {
        expect(locales(esUnwritten, ar).getLanguageAttributes(start)).toEqual({
            lang: 'ar-SA',
            dir: 'rtl',
        });
    });
});
