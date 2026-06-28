import { Unwritten } from '@locale/Annotations';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Locales, { MULTILINGUAL_SEPARATOR } from '@locale/Locales';
import { describe, expect, test } from 'vitest';

/** Build a locale that's like en-US but with a different language and `glossary.start.word`. */
function localeWith(language: string, start: string): LocaleText {
    return {
        ...DefaultLocale,
        language,
        glossary: {
            ...DefaultLocale.glossary,
            start: { ...DefaultLocale.glossary.start, word: start },
        },
    } as unknown as LocaleText;
}

const en = DefaultLocale; // glossary.start.word === 'start'
const es = localeWith('es', 'empezar');
const esUnwritten = localeWith('es', Unwritten);

function locales(...preferred: LocaleText[]) {
    return new Locales(concretize, preferred, DefaultLocale);
}

const start = (l: LocaleText) => l.glossary.start.word;

describe('getSecondaryLocaleViews', () => {
    test('is empty for a single chosen locale', () => {
        expect(locales(en).getSecondaryLocaleViews()).toHaveLength(0);
    });

    test('returns one single-locale view per non-primary locale, in order', () => {
        const views = locales(en, es).getSecondaryLocaleViews();
        expect(views).toHaveLength(1);
        expect(views[0].getLocale().language).toBe('es');
    });

    test('an unwritten secondary string stays detectable (no English fallback)', () => {
        const [view] = locales(en, esUnwritten).getSecondaryLocaleViews();
        // Falls back to its own locale (annotated unwritten), not to English.
        expect(view.getWithAnnotations(start).startsWith(Unwritten)).toBe(true);
    });
});

describe('getMultilingualEntries', () => {
    test('single locale collapses to one entry equal to the resolved text', () => {
        const entries = locales(en).getMultilingualEntries(start);
        expect(entries).toHaveLength(1);
        expect(entries[0].text).toBe('start');
    });

    test('multiple locales return ordered, primary-first entries with languages', () => {
        const entries = locales(en, es).getMultilingualEntries(start);
        expect(entries.map((e) => e.text)).toEqual(['start', 'empezar']);
        expect(entries.map((e) => e.language)).toEqual(['en', 'es']);
    });

    test('skips a secondary that is unwritten in its own locale', () => {
        const entries = locales(en, esUnwritten).getMultilingualEntries(start);
        expect(entries.map((e) => e.text)).toEqual(['start']);
    });

    test('dedupes a secondary that equals the primary', () => {
        const entries = locales(
            en,
            localeWith('es', 'start'),
        ).getMultilingualEntries(start);
        expect(entries.map((e) => e.text)).toEqual(['start']);
    });
});

describe('getUnannotatedText / getPlainText join chosen locales', () => {
    test('single locale is identical to the primary text', () => {
        expect(locales(en).getUnannotatedText(start)).toBe('start');
        expect(locales(en).getPlainText(start)).toBe('start');
    });

    test('multiple locales join with the separator', () => {
        const expected = `start${MULTILINGUAL_SEPARATOR}empezar`;
        expect(locales(en, es).getUnannotatedText(start)).toBe(expected);
        expect(locales(en, es).getPlainText(start)).toBe(expected);
    });

    test('getUnannotatedPrimaryText stays single-locale for identity use', () => {
        expect(locales(en, es).getUnannotatedPrimaryText(start)).toBe('start');
    });
});

describe('getMultilingualMarkup', () => {
    test('concretizes each chosen locale to markup, ordered primary-first', () => {
        const entries = locales(en, es).getMultilingualMarkup(start);
        expect(entries.map((e) => e.markup.toText())).toEqual([
            'start',
            'empezar',
        ]);
    });
});

describe('getMultilingualFrom', () => {
    test('formats a structure subtree per chosen locale', () => {
        const entries = locales(en, es).getMultilingualFrom(
            (l) => l.glossary,
            (glossary) => glossary.start.word,
        );
        expect(entries.map((e) => e.text)).toEqual(['start', 'empezar']);
    });
});
