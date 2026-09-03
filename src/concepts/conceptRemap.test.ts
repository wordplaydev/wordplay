// Import Database first: it eagerly constructs the DB singleton, which must finish before
// ConceptIndex pulls in HowToDatabase (otherwise a circular import leaves it half-defined).
import '@db/Database';
import ConceptIndex from '@concepts/ConceptIndex';
import Project from '@db/projects/Project';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import type LanguageCode from '@locale/LanguageCode';
import Locales from '@locale/Locales';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

/**
 * The guide and the project's docs tile both hold the concept you are reading as
 * an *object*, in a navigation history — and changing locale rebuilds the index
 * with entirely fresh concepts. So a rebuilt index has to be able to say which
 * of its concepts is the one you were looking at, which is what
 * `getCorresponding` is for.
 *
 * Getting this wrong is invisible rather than loud, which is why it is worth a
 * test: the stale concept still renders, because it carries its own
 * documentation, while everything the new index is asked *about* it comes back
 * empty — `getHowTosForConcept` is a `Map` keyed by concept identity, so a
 * concept's how-to links simply vanished until the page was refreshed.
 */

function indexFor(language: LanguageCode) {
    const locales = new Locales(
        concretize,
        [{ ...DefaultLocale, language }],
        DefaultLocale,
    );
    const project = Project.make(
        null,
        'guide',
        Source.make(''),
        [],
        locales.getLocales(),
    );
    return ConceptIndex.make(project, locales, [], []);
}

describe('a concept survives a change of locale', () => {
    const english = indexFor('en');
    const japanese = indexFor('ja');

    test.each([
        ['en', 'ja'],
        ['ja', 'en'],
    ])("every concept's token resolves from %s to %s", (from) => {
        // The token is what carries a concept across locales, so this is the
        // property `getCorresponding` leans on. Asserted for every concept
        // because the point is that there is no gap; `getCorresponding` itself
        // is exercised on a sample below, since its first step is a linear
        // structural search and running that 900 times is quadratic.
        const [before, after] =
            from === 'en' ? [english, japanese] : [japanese, english];
        const missing = before.concepts
            .map((concept) => before.getConceptToken(concept))
            .filter((token) => after.getConceptByToken(token) === undefined);
        expect(missing).toEqual([]);
        // Guard against passing vacuously if the basis ever stops producing
        // concepts here.
        expect(before.concepts.length).toBeGreaterThan(100);
    });

    test('a concept a reader was looking at is found in the new locale', () => {
        for (const token of ['💬', '🎭', '🔡']) {
            const concept = english.getConceptByToken(token);
            expect({ token, found: concept !== undefined }).toEqual({
                token,
                found: true,
            });
            if (concept)
                expect({
                    token,
                    corresponding:
                        japanese.getCorresponding(concept) !== undefined,
                }).toEqual({ token, corresponding: true });
        }
    });

    test('structural equality alone is not enough, which is why there is a fallback', () => {
        // A basis is built per locale, so the definitions a concept wraps are
        // different objects and `isEqualTo` recognizes only a minority. Stated
        // as a comparison over a sample rather than a count, so it survives
        // concepts being added and stays cheap.
        const sample = english.concepts.slice(0, 100);
        const byEquality = sample.filter(
            (concept) => japanese.getEquivalent(concept) !== undefined,
        ).length;
        expect(byEquality).toBeLessThan(sample.length);
    });
});
