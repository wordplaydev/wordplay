import { describe, expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import ConceptLink from '@nodes/ConceptLink';
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
});
