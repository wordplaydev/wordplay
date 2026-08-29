import Gallery from '@db/galleries/Gallery';
import DefaultLocales from '@locale/DefaultLocales';
import { describe, expect, test } from 'vitest';
import { galleriesWorthSearching, searchGalleries } from './search';

/**
 * Search over galleries (#299), and the prefilter that decides which public
 * galleries are worth opening to search their projects (#1311).
 */

function gallery(
    id: string,
    name: Record<string, string>,
    description: Record<string, string>,
    words: string[] = [],
) {
    return Gallery.make(id, name, description, [], [], { words });
}

const games = gallery(
    'games',
    { 'en-US': 'Games' },
    { 'en-US': 'Interactive games with words and symbols.' },
    ['games', 'interactive', 'basketball', 'star'],
);
const music = gallery(
    'music',
    { 'en-US': 'Music' },
    { 'en-US': 'Songs and instruments that move to the beat.' },
    ['music', 'songs', 'instruments', 'chimes'],
);

describe('searchGalleries', () => {
    test('finds a gallery by name', () => {
        expect(
            searchGalleries([games, music], 'music', DefaultLocales).map((m) =>
                m.gallery.getID(),
            ),
        ).toEqual(['music']);
    });

    test('finds a gallery by description, with an excerpt of the match', () => {
        const [match, ...rest] = searchGalleries(
            [games, music],
            'symbols',
            DefaultLocales,
        );
        expect(rest).toHaveLength(0);
        expect(match.gallery.getID()).toBe('games');
        // A description hit carries a snippet; a name hit doesn't need one.
        expect(match.matchText).toContain('symbols');
    });

    test('ranks a name match above a description match', () => {
        // "games" is Games' name and appears in its own description; a gallery
        // whose only hit is in prose must not outrank it.
        const prose = gallery(
            'about',
            { 'en-US': 'Odds and ends' },
            { 'en-US': 'Leftovers from making games.' },
        );
        expect(
            searchGalleries(
                [prose, games],
                'games',
                DefaultLocales,
            )[0].gallery.getID(),
        ).toBe('games');
    });

    test('finds a gallery named in another language than the reader is using', () => {
        // Every locale's name is indexed, the same reason a project flattens
        // its names (#456).
        const bilingual = gallery(
            'juegos',
            { 'en-US': 'Games', 'es-MX': 'Juegos' },
            { 'en-US': 'Fun' },
        );
        expect(
            searchGalleries([bilingual], 'juegos', DefaultLocales),
        ).toHaveLength(1);
    });

    test('tolerates a typo once the query is long enough to afford one', () => {
        // maxEditsForQuery allows an edit from four graphemes on; below that,
        // matching is substring-only.
        expect(searchGalleries([music], 'musik', DefaultLocales)).toHaveLength(
            1,
        );
        expect(searchGalleries([music], 'mzs', DefaultLocales)).toHaveLength(0);
    });

    test('returns everything, unranked, for an empty term', () => {
        expect(
            searchGalleries([games, music], '  ', DefaultLocales),
        ).toHaveLength(2);
    });
});

describe('galleriesWorthSearching', () => {
    test("selects a gallery whose word index holds one of its projects' names", () => {
        // Nothing in Games' name or description says "basketball"; the index
        // is the only reason this gallery is worth opening.
        expect(
            galleriesWorthSearching(
                [games, music],
                'basketball',
                DefaultLocales,
            ).map((g) => g.getID()),
        ).toEqual(['games']);
    });

    test('selects nothing when no gallery could match, so nothing is fetched', () => {
        expect(
            galleriesWorthSearching([games, music], 'zzzz', DefaultLocales),
        ).toEqual([]);
    });

    test('selects nothing for an empty term', () => {
        expect(
            galleriesWorthSearching([games, music], '', DefaultLocales),
        ).toEqual([]);
    });

    test('still selects a gallery matched by name when its index is empty', () => {
        // A gallery the indexing trigger hasn't reached yet must not become
        // unsearchable.
        const unindexed = gallery(
            'fresh',
            { 'en-US': 'Fresh' },
            { 'en-US': 'Brand new' },
        );
        expect(
            galleriesWorthSearching([unindexed], 'fresh', DefaultLocales).map(
                (g) => g.getID(),
            ),
        ).toEqual(['fresh']);
    });

    test('agrees with the full search on a gallery name', () => {
        // The prefilter runs the same engine, so it can never drop a gallery
        // the search itself would have matched by name or description.
        for (const term of ['games', 'music', 'songs', 'symbols']) {
            const searched = searchGalleries(
                [games, music],
                term,
                DefaultLocales,
            ).map((m) => m.gallery.getID());
            const prefiltered = galleriesWorthSearching(
                [games, music],
                term,
                DefaultLocales,
            ).map((g) => g.getID());
            for (const id of searched) expect(prefiltered).toContain(id);
        }
    });
});
