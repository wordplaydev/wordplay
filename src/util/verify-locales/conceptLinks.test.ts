import {
    mismatchedConceptLinks,
    protectConceptLinks,
    restoreConceptLinks,
} from '@util/verify-locales/protect';
import { describe, expect, test } from 'vitest';

/** Mask, pretend to translate the prose, restore. */
function roundTrip(text: string, translate: (masked: string) => string) {
    const { masked, links } = protectConceptLinks(text);
    return restoreConceptLinks(translate(masked), links);
}

describe('protectConceptLinks', () => {
    test('a masked link is not translatable text', () => {
        const { masked, links } = protectConceptLinks(
            'Ask @Program to meet @Group.',
        );
        expect(masked).not.toContain('@Program');
        expect(masked).not.toContain('@Group');
        expect(links).toEqual(['@Program', '@Group']);
    });

    test('round-trips several links, a property link, and none at all', () => {
        for (const text of [
            'Ask @Program to meet @Group and @Program again.',
            'Set its @Phrase.name to something.',
            'No links here at all.',
        ])
            expect(roundTrip(text, (m) => m)).toBe(text);
    });

    test('survives a translation that reorders the sentence', () => {
        // Grammar moves words around, so restoring by position in the output
        // would put the wrong link back. The index rides along instead.
        const text = 'Ask @Program to meet @Group.';
        const { masked, links } = protectConceptLinks(text);
        const [a, b] = [...masked.matchAll(/⟦\d+⟧/gu)].map((m) => m[0]);
        const reordered = `${b} was met by ${a}.`;
        expect(restoreConceptLinks(reordered, links)).toBe(
            '@Group was met by @Program.',
        );
    });
});

describe('mismatchedConceptLinks', () => {
    test('passes when the links survive', () => {
        expect(
            mismatchedConceptLinks(
                'Ask @Program to meet @Group.',
                'Pide a @Program que conozca a @Group.',
            ),
        ).toBeUndefined();
    });

    test('catches a translated concept name', () => {
        // The actual failure: @Program came back as @Програм in sr-RS.
        expect(
            mismatchedConceptLinks(
                '@Program did not know what to do.',
                '@Програм није знао шта да ради.',
            ),
        ).toBe('@Program');
    });

    test('catches a dropped link', () => {
        expect(
            mismatchedConceptLinks(
                'Ask @Program to meet @Group.',
                'Pide a @Program que conozca al grupo.',
            ),
        ).toBe('@Group');
    });

    test('catches an invented link', () => {
        // zh-CN gained @Stream where en-US had the plain word "streams".
        expect(
            mismatchedConceptLinks(
                'We met all the streams.',
                '我们见过 @Stream。',
            ),
        ).toBe('@Stream');
    });

    test('counts repeats, not just presence', () => {
        expect(
            mismatchedConceptLinks(
                '@Group inside a @Group inside a @Group.',
                '@Group inside a @Group.',
            ),
        ).toBe('@Group');
    });

    test('the case restoreReferences gets wrong', () => {
        // sr-RS: the translation carried fewer links than the source, which is
        // exactly when the positional repair mismaps or gives up. The guard
        // doesn't care about position or count symmetry — it just notices.
        const source =
            '@Program showed an @UI/exception because of @ExpressionPlaceholder.';
        const translation = '@Програм показао @UI/exception.';
        expect(mismatchedConceptLinks(source, translation)).toBe('@Program');
    });
});
