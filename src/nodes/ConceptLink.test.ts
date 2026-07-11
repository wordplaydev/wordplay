import { describe, expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import ConceptLink, { CodepointName } from '@nodes/ConceptLink';
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
