import DefaultLocale from '@locale/DefaultLocale';
import {
    foldGlossaryForm,
    getGlossaryFormIndex,
    getGlossaryForms,
} from '@locale/Glossary';
import type LocaleText from '@locale/LocaleText';
import { expect, test } from 'vitest';

/** en-US, but with one glossary term replaced. */
function localeWithTerm(
    id: 'value' | 'parameter',
    word: string,
    forms?: string[],
): LocaleText {
    return {
        ...DefaultLocale,
        language: 'es',
        glossary: {
            ...DefaultLocale.glossary,
            // Built from scratch rather than spread, so en-US's own forms don't
            // leak into a locale meant to have none.
            [id]: {
                word,
                definition: DefaultLocale.glossary[id].definition,
                ...(forms === undefined ? {} : { forms }),
            },
        },
    };
}

test('folding ignores case, annotations, and composition', () => {
    expect(foldGlossaryForm('Parameters')).toBe('parameters');
    expect(foldGlossaryForm('$~Parámetros')).toBe('parámetros');
    // Composed and decomposed spellings of the same word fold together, so a
    // form typed either way still matches.
    const decomposed = 'parámetros'.normalize('NFD');
    expect(decomposed).not.toBe('parámetros');
    expect(foldGlossaryForm(decomposed)).toBe(foldGlossaryForm('parámetros'));
});

test('a term’s forms come back annotation-free, with empties dropped', () => {
    const locale = localeWithTerm('value', 'valor', ['$~valores', '', '  ']);
    expect(getGlossaryForms(locale, 'value')).toEqual(['valores']);
    // A term with no forms declared has none.
    expect(getGlossaryForms(DefaultLocale, 'wordplay')).toEqual([]);
});

test('the index maps a term’s id, word, and forms to it', () => {
    const index = getGlossaryFormIndex(DefaultLocale);
    for (const form of ['parameter', 'parameters', 'Parameters'])
        expect(index.get(foldGlossaryForm(form))).toEqual({
            id: 'parameter',
            native: true,
        });
    expect(index.get('coolbeans')).toBeUndefined();
});

test('a locale’s own forms win over the en-US fallback', () => {
    const index = getGlossaryFormIndex(
        localeWithTerm('parameter', 'parámetro', ['parámetros']),
    );
    expect(index.get('parámetros')).toEqual({
        id: 'parameter',
        native: true,
    });
    // en-US's forms still resolve, but not as this locale's own, so a reference
    // that kept the English form displays this locale's canonical word.
    expect(index.get('parameters')).toEqual({
        id: 'parameter',
        native: false,
    });
});

test('the index is memoized per locale', () => {
    const locale = localeWithTerm('value', 'valor', ['valores']);
    expect(getGlossaryFormIndex(locale)).toBe(getGlossaryFormIndex(locale));
});
