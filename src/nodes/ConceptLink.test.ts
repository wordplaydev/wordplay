import { describe, expect, test } from 'vitest';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Locales from '@locale/Locales';
import TermRef from '@locale/TermRef';
import ConceptLink, {
    CharacterName,
    CodepointName,
    ConceptName,
    GlossaryName,
} from '@nodes/ConceptLink';
import parseDoc from '@parser/parseDoc';
import { DOCS_SYMBOL } from '@parser/Symbols';
import { toTokens } from '@parser/toTokens';

/** Build the ConceptLink from an `@ref` written inside a doc. */
function link(ref: string): ConceptLink {
    const found = parseDoc(toTokens(`${DOCS_SYMBOL} ${ref} ${DOCS_SYMBOL}`))
        .nodes()
        .find((n): n is ConceptLink => n instanceof ConceptLink);
    if (found === undefined)
        throw new Error(`no ConceptLink parsed from ${ref}`);
    return found;
}

describe('ConceptLink.isValid', () => {
    test('a glossary term that parses as a how-to keyword is valid (@how)', () => {
        // `@how` parses as a HowToName but `how` is a glossary term ("how-to");
        // it must validate via the glossary fallback, not as a how-to id.
        expect(link('@how').isValid(DefaultLocale)).toBe(true);
    });

    test('glossary terms validate (@value)', () => {
        expect(link('@value').isValid(DefaultLocale)).toBe(true);
    });

    test('concept links validate (@Phrase)', () => {
        expect(link('@Phrase').isValid(DefaultLocale)).toBe(true);
    });

    test('a concept with an unknown property does not validate', () => {
        expect(link('@Phrase/notaprop').isValid(DefaultLocale)).toBe(false);
    });

    test('codepoint references validate (@U/1F600)', () => {
        expect(link('@U/1F600').isValid(DefaultLocale)).toBe(true);
    });

    test.each(['@U', '@U/xyz', '@U/FFFFFF1', '@U/D800', '@U/00'])(
        'an invalid codepoint reference does not validate (%s)',
        (ref) => {
            expect(link(ref).isValid(DefaultLocale)).toBe(false);
        },
    );
});

/** A locale like en-US, but with the `parameter` term rewritten. */
function localeWithParameter(word: string, forms?: string[]): LocaleText {
    return {
        ...DefaultLocale,
        language: 'es',
        glossary: {
            ...DefaultLocale.glossary,
            // Built from scratch rather than spread, so en-US's own forms don't
            // leak into a locale meant to have none.
            parameter: {
                word,
                definition: DefaultLocale.glossary.parameter.definition,
                ...(forms === undefined ? {} : { forms }),
            },
        },
    };
}

function toLocales(locale: LocaleText) {
    return new Locales(concretize, [locale], DefaultLocale);
}

describe('ConceptLink glossary forms', () => {
    test('an inflected form resolves to its term, keeping the form as written', () => {
        for (const name of ['parameters', 'Parameters']) {
            const parsed = ConceptLink.parse(name);
            expect(parsed).toBeInstanceOf(GlossaryName);
            expect(parsed).toMatchObject({ id: 'parameter', form: name });
        }
    });

    test('the term’s own id or word carries no form, so its canonical word shows', () => {
        expect(ConceptLink.parse('parameter')).toMatchObject({
            id: 'parameter',
            form: undefined,
        });
    });

    test('a concept name wins over a glossary form', () => {
        // `Key` is a documented input concept as well as folding onto the `key`
        // term's word, so it must still resolve to the concept.
        expect(ConceptLink.parse('Key')).toBeInstanceOf(ConceptName);
    });

    test('an unknown name is still a character reference', () => {
        expect(ConceptLink.parse('coolbeans')).toBeInstanceOf(CharacterName);
        // A property makes it a character reference too, so a creator's
        // `@username/character` can't be shadowed by a form.
        expect(ConceptLink.parse('parameters/x')).toBeInstanceOf(CharacterName);
    });

    test('a form validates, in its own locale and through the en-US fallback', () => {
        expect(link('@parameters').isValid(DefaultLocale)).toBe(true);
        // A locale with its own forms validates those, and still validates the
        // English form, which translation keeps verbatim.
        const locale = localeWithParameter('parámetro', ['parámetros']);
        expect(link('@parámetros').isValid(locale)).toBe(true);
        expect(link('@parameters').isValid(locale)).toBe(true);
    });

    test('a form concretizes to a term showing the form as written', () => {
        const term = link('@parameters').concretize(toLocales(DefaultLocale));
        expect(term).toBeInstanceOf(TermRef);
        expect(term).toMatchObject({ id: 'parameter', word: 'parameters' });
        expect(
            link('@Parameters').concretize(toLocales(DefaultLocale)),
        ).toMatchObject({ word: 'Parameters' });
    });

    test('a locale’s own form shows as written; an English one shows its word', () => {
        const withForms = toLocales(
            localeWithParameter('parámetro', ['parámetros']),
        );
        expect(link('@parámetros').concretize(withForms)).toMatchObject({
            id: 'parameter',
            word: 'parámetros',
        });
        // A translated string that kept the English reference verbatim reads
        // exactly as `@parameter` does — the locale's canonical word.
        expect(link('@parameters').concretize(withForms)).toMatchObject({
            id: 'parameter',
            word: 'parámetro',
        });
        // And a locale with no forms of its own behaves the same way.
        expect(
            link('@parameters').concretize(
                toLocales(localeWithParameter('parámetro')),
            ),
        ).toMatchObject({ id: 'parameter', word: 'parámetro' });
    });
});

describe('ConceptLink.parse codepoints', () => {
    test.each(['U/1F600', 'u/1f600', 'U.1F600'])(
        'the reserved U namespace resolves a codepoint (%s)',
        (name) => {
            const parsed = ConceptLink.parse(name);
            expect(parsed).toBeInstanceOf(CodepointName);
            expect(
                parsed instanceof CodepointName ? parsed.codepoint : undefined,
            ).toBe('😀');
        },
    );

    test('a hex-looking name is not a codepoint (@Face is a name)', () => {
        // `Face` is all hex digits (0xFACE), but only the `U` namespace denotes
        // a codepoint, so it classifies as a (possible) concept or character
        // name — protecting concepts like a `Face` stream from being shadowed.
        expect(ConceptLink.parse('Face')).not.toBeInstanceOf(CodepointName);
        expect(link('@1F600').getCodepoint()).toBeUndefined();
    });

    test('getCodepoint agrees with parse', () => {
        expect(link('@U/1F600').getCodepoint()).toBe('😀');
    });
});
