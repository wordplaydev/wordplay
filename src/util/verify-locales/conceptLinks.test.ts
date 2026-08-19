import {
    mismatchedConceptLinks,
    hasResidualLinkMask,
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

describe('resilience to a roughened-up placeholder', () => {
    const text = 'Give me a @value and I will use the @Number you name.';

    /** What the model hands back, standing in for a translation. */
    function roundTrip(mutate: (masked: string) => string): string {
        const { masked, links } = protectConceptLinks(text);
        return restoreConceptLinks(mutate(masked), links);
    }

    test('digits transliterated into the target script still restore', () => {
        // Kannada, Telugu, Devanagari, Arabic-Indic. `\d` under /u matches only
        // ASCII, so each of these used to leave the placeholder unmatched — the
        // link was dropped, or the raw `⟦೦⟧` shipped to a reader.
        for (const [zero, one] of [
            ['೦', '೧'],
            ['౦', '౧'],
            ['०', '१'],
            ['٠', '١'],
        ]) {
            const restored = roundTrip((m) =>
                m.replace('0', zero).replace('1', one),
            );
            expect(restored).toContain('@value');
            expect(restored).toContain('@Number');
            expect(hasResidualLinkMask(restored)).toBe(false);
        }
    });

    test('padding inside the brackets still restores', () => {
        const restored = roundTrip((m) => m.replace(/⟦(\d+)⟧/g, '⟦ $1 ⟧'));
        expect(restored).toContain('@value');
        expect(restored).toContain('@Number');
    });

    test('a look-alike bracket still restores', () => {
        for (const [open, close] of [
            ['〚', '〛'],
            ['【', '】'],
        ]) {
            const restored = roundTrip((m) =>
                m.replaceAll('⟦', open).replaceAll('⟧', close),
            );
            expect(restored).toContain('@value');
        }
    });

    test('ASCII brackets are left alone, since markup uses them', () => {
        // `$value[true|false]` is a real template branch — eating it would
        // corrupt the string far worse than a lost link.
        expect(hasResidualLinkMask('$value[true|false]')).toBe(false);
        expect(hasResidualLinkMask('a [0] b')).toBe(false);
    });

    test('a placeholder with no link to restore is reported, not shipped', () => {
        // The failure mode that put seven raw placeholders in gu-IN's tutorial.
        const { masked } = protectConceptLinks(text);
        expect(hasResidualLinkMask(restoreConceptLinks(masked, []))).toBe(true);
    });

    test('a dropped placeholder is still detectable as a lost link', () => {
        const restored = roundTrip((m) => m.replace(/⟦0⟧/, ''));
        expect(restored).not.toContain('@value');
        expect(hasResidualLinkMask(restored)).toBe(false);
    });
});
