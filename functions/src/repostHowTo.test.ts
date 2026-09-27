import { describe, expect, it } from 'vitest';
import {
    deriveRepostReaders,
    howToChatParticipants,
    MaxHowToReposts,
    mayUnrepost,
    repostReadersChanged,
    repostRefusal,
    type RepostFacts,
    type RepostGallery,
} from './repostHowTo.js';

/**
 * Reposting a how-to into other galleries (#1065). The callable's decisions and
 * the reader list it keeps flat are the whole of what the rules trust, so the
 * pure halves are tested here, as the gallery and how-to triggers' are.
 */

function gallery(over: Partial<RepostGallery> = {}): RepostGallery {
    return {
        public: false,
        curators: [],
        creators: [],
        howToExpandedVisibility: false,
        howToViewersFlat: [],
        ...over,
    };
}

function facts(over: Partial<RepostFacts> = {}): RepostFacts {
    return {
        uid: 'author',
        banned: false,
        howTo: {
            creator: 'author',
            collaborators: ['coauthor'],
            galleryId: 'home',
            published: true,
            reposts: [],
        },
        home: gallery({ curators: ['teacher'] }),
        destinationID: 'elsewhere',
        destination: gallery({ curators: ['author', 'teacher'] }),
        ...over,
    };
}

describe('deriveRepostReaders', () => {
    it("lets in each gallery's members, sorted and once each", () => {
        expect(
            deriveRepostReaders(false, [
                gallery({ curators: ['c'], creators: ['a', 'b'] }),
                gallery({ curators: ['b'], creators: ['d'] }),
            ]),
        ).toEqual({
            repostReaders: ['a', 'b', 'c', 'd'],
            repostedPublicly: false,
        });
    });

    it('lets in expanded viewers only when the how-to did not opt out', () => {
        const expanded = gallery({
            howToExpandedVisibility: true,
            howToViewersFlat: ['guest'],
        });
        expect(deriveRepostReaders(false, [expanded]).repostReaders).toEqual([
            'guest',
        ]);
        expect(deriveRepostReaders(true, [expanded]).repostReaders).toEqual([]);
    });

    it('is public when any gallery is', () => {
        expect(
            deriveRepostReaders(false, [gallery(), gallery({ public: true })])
                .repostedPublicly,
        ).toBe(true);
    });

    it('reports no change when nothing moved, so the trigger does not loop', () => {
        const derived = deriveRepostReaders(false, [
            gallery({ creators: ['b', 'a'] }),
        ]);
        expect(
            repostReadersChanged(
                { repostReaders: ['a', 'b'], repostedPublicly: false },
                derived,
            ),
        ).toBe(false);
        expect(repostReadersChanged({}, derived)).toBe(true);
    });
});

describe('repostRefusal', () => {
    it('allows an author who curates the destination', () => {
        expect(repostRefusal(facts())).toBeUndefined();
    });

    it('allows a curator of its home who curates the destination', () => {
        expect(repostRefusal(facts({ uid: 'teacher' }))).toBeUndefined();
    });

    it.each<[string, Partial<RepostFacts>, string]>([
        ['a missing destination', { destination: undefined }, 'missing'],
        [
            'a draft',
            { howTo: { ...facts().howTo, published: false } },
            'unpublished',
        ],
        ['its own home', { destinationID: 'home' }, 'home'],
        [
            'a gallery it is already in',
            { howTo: { ...facts().howTo, reposts: ['elsewhere'] } },
            'already',
        ],
        [
            'one gallery too many',
            {
                howTo: {
                    ...facts().howTo,
                    reposts: Array.from(
                        { length: MaxHowToReposts },
                        (_, i) => `g${i}`,
                    ),
                },
            },
            'too-many',
        ],
        [
            'someone who cannot edit it',
            {
                uid: 'stranger',
                destination: gallery({ curators: ['stranger'] }),
            },
            'not-editor',
        ],
        [
            'someone who does not curate the destination',
            { destination: gallery({ creators: ['author'] }) },
            'not-curator',
        ],
        [
            'a banned creator, into a public gallery',
            {
                banned: true,
                destination: gallery({ public: true, curators: ['author'] }),
            },
            'banned',
        ],
    ])('refuses %s', (_, over, refusal) => {
        expect(repostRefusal(facts(over))).toBe(refusal);
    });

    it('lets a banned creator repost into a private class gallery', () => {
        expect(repostRefusal(facts({ banned: true }))).toBeUndefined();
    });
});

describe('mayUnrepost', () => {
    it("is the destination's curators' and the how-to's editors'", () => {
        expect(mayUnrepost(facts({ uid: 'author' }))).toBe(true);
        expect(mayUnrepost(facts({ uid: 'coauthor' }))).toBe(true);
        expect(
            mayUnrepost(
                facts({
                    uid: 'other',
                    destination: gallery({ curators: ['other'] }),
                }),
            ),
        ).toBe(true);
        expect(mayUnrepost(facts({ uid: 'stranger' }))).toBe(false);
    });
});

describe('howToChatParticipants', () => {
    it('is its authors, its home, and everyone a repost lets in', () => {
        expect(
            howToChatParticipants(
                facts().howTo,
                gallery({ curators: ['teacher'], creators: ['student'] }),
                ['reader'],
            ),
        ).toEqual(['author', 'coauthor', 'reader', 'student', 'teacher']);
    });

    it('still names its authors when the home is gone', () => {
        expect(howToChatParticipants(facts().howTo, undefined, [])).toEqual([
            'author',
            'coauthor',
        ]);
    });
});
