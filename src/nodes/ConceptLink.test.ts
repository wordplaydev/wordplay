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
    TourName,
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

describe('ConceptLink.parse tours', () => {
    test('a tour reference parses as a tour', () => {
        const parsed = ConceptLink.parse('Tour/source');
        expect(parsed).toBeInstanceOf(TourName);
        expect((parsed as TourName).id).toBe('source');
    });

    test('an unknown tour still parses as a tour, so isValid can report it', () => {
        // Falling through to a character reference would make the typo
        // unreportable: a creator's characters aren't known at check time, so
        // every one of them validates.
        const parsed = ConceptLink.parse('Tour/nosuchtour');
        expect(parsed).toBeInstanceOf(TourName);
    });

    test('a bare @tour is not a tour reference', () => {
        expect(ConceptLink.parse('tour')).not.toBeInstanceOf(TourName);
    });

    test.each(['@Tour/source', '@Tour/stage', '@tour/palette'])(
        '%s is valid',
        (ref) => {
            expect(link(ref).isValid(DefaultLocale)).toBe(true);
        },
    );

    test('a reference to a tour that does not exist is invalid', () => {
        expect(link('@Tour/nosuchtour').isValid(DefaultLocale)).toBe(false);
    });

    test('a tour reference describes itself as a tour', () => {
        expect(
            link('@Tour/source')
                .getDescription(
                    new Locales(concretize, [DefaultLocale], DefaultLocale),
                    // getDescription doesn't consult the context for a reference.
                    undefined as unknown as Parameters<
                        ConceptLink['getDescription']
                    >[1],
                )
                .toText(),
        ).toContain('source');
    });
});

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

describe('a reference ends where the script changes', () => {
    /** The doc's nodes, so we can see what followed the reference. */
    function parts(text: string) {
        const doc = parseDoc(toTokens(`${DOCS_SYMBOL}${text}${DOCS_SYMBOL}`));
        const found = doc
            .nodes()
            .find((n): n is ConceptLink => n instanceof ConceptLink);
        return { link: found, wordplay: doc.toWordplay() };
    }

    test.each([
        // Korean particle, Devanagari danda, Arabic comma, a whole phrase.
        ['@Doc의', 'Doc', '의'],
        ['@wordplay가', 'wordplay', '가'],
        ['@language।', 'language', '।'],
        ['@value،', 'value', '،'],
        ['@wordplayプログラムを作る', 'wordplay', 'プログラムを作る'],
    ])(
        '%s is a reference to %s followed by text',
        (written, name, trailing) => {
            // Attached native-script text used to become part of the name, which
            // resolved to nothing and rendered as a broken character glyph.
            const { link: found, wordplay } = parts(written);
            expect(found?.getName()).toBe(name);
            // The source is unchanged — only how it tokenizes.
            expect(wordplay).toBe(`${DOCS_SYMBOL}${written}${DOCS_SYMBOL}`);
            expect(written.slice(1 + name.length)).toBe(trailing);
        },
    );

    test('a name written entirely in another script stays one reference', () => {
        // A locale's own glossary form is native-script; splitting it would
        // break the forms feature these references rely on.
        expect(parts('@프로그램').link?.getName()).toBe('프로그램');
        expect(parts('@amy/고양이').link?.getName()).toBe('amy/고양이');
        expect(parts('@параметр').link?.getName()).toBe('параметр');
    });

    test('a Latin name keeps its diacritics', () => {
        // The split is by script, not by ASCII: `á` is Latin, so a Spanish
        // glossary form is one name. Splitting at the accent would break every
        // Latin-script locale's forms.
        expect(parts('@parámetros').link?.getName()).toBe('parámetros');
        expect(parts('@größe').link?.getName()).toBe('größe');
        expect(parts('@mềm').link?.getName()).toBe('mềm');
        // Written with a combining accent rather than a precomposed one, the
        // name still holds together (the source is normalized on the way in).
        expect(parts('@parámetros'.normalize('NFD')).link?.getName()).toBe(
            'parámetros',
        );
    });

    test("another script's combining mark does not extend a Latin name", () => {
        // A Devanagari vowel sign or Tamil matra right after a reference is
        // part of the word being written, not of the reference.
        expect(parts('@codeा').link?.getName()).toBe('code');
        expect(parts('@Tableே').link?.getName()).toBe('Table');
    });

    test('an invisible format character does not extend a Latin name', () => {
        // A zero-width non-joiner is script-Inherited like a combining accent,
        // and Indic text uses one straight after a reference.
        expect(parts('@code‌ను').link?.getName()).toBe('code');
        // But it belongs inside a word in scripts that shape with it.
        expect(parts('@می‌رود').link?.getName()).toBe('می‌رود');
    });

    test.each(['@Phrase', '@Color.random', '@amy/cat', '@U/1F600'])(
        '%s is unchanged',
        (written) => {
            expect(parts(written).link?.getName()).toBe(written.slice(1));
        },
    );

    test('an all-ASCII typo stays one broken name', () => {
        // Resolving to the longest valid prefix would hide typos; only a script
        // change ends a name.
        expect(parts('@Phrasee').link?.getName()).toBe('Phrasee');
    });
});
