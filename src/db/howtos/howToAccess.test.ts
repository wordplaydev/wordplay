import { describe, expect, test, vi } from 'vitest';
import { must } from '@util/nullable';

// `HowToDatabase.svelte.ts` reaches `@db/Database` for the singleton, which
// constructs every domain database at import — the same circular import
// `HowToDatabase.test.ts` mocks around. Only the `HowTo` wrapper class is under
// test here, and it needs none of it.
vi.mock('@db/firebase', () => ({ firestore: undefined }));
vi.mock('@db/Database', () => ({}));

import Gallery from '@db/galleries/Gallery';
import { unknownFlags } from '@db/projects/Moderation';
import HowTo, { type HowToDocument } from './HowToDatabase.svelte';
import {
    canConfigureHowToSpace,
    canCreateHowTo,
    canDeleteHowTo,
    canEditHowTo,
    canInteractSocially,
    canSubmitToGuide,
    canMoveHowTo,
    canRepostHowTo,
    canUnrepostHowTo,
    howToChatParticipants,
    repostDestinations,
} from './howToAccess';
import {
    Actions,
    Actors,
    GalleryPermissions,
    permits,
    Scenarios,
    ServerOnlyActions,
    ServerOnlyActors,
    type Action,
    type Actor,
    type Scenario,
    RepostActions,
    RepostActors,
    RepostScenarios,
    type RepostAction,
    type RepostActor,
} from './howToAccessScenarios';
import { MaxHowToReposts } from '@db/rulesFields';

/**
 * The client half of #907's permission matrix. `tests/rules/howToRules.test.ts`
 * drives the same table against the emulator, so an affordance the interface
 * offers that the server would refuse — the silent-refusal class of #1348-#1350
 * — fails here rather than in someone's browser.
 */

const Uid: Record<Exclude<Actor, 'anon'>, string> = {
    owner: 'owner-uid',
    collaborator: 'collaborator-uid',
    curator: 'curator-uid',
    galleryCreator: 'gallerycreator-uid',
    viewer: 'viewer-uid',
    stranger: 'stranger-uid',
    mod: 'mod-uid',
};

function galleryFor(scenario: Scenario): Gallery {
    return Gallery.make(
        'gallery',
        { 'en-US': 'Gallery' },
        { 'en-US': '' },
        [Uid.curator],
        [Uid.galleryCreator],
        {
            howTos: ['howto'],
            public: scenario.gallery.public,
            howToExpandedVisibility: scenario.gallery.expandedVisibility,
            howToViewers: { source: [Uid.viewer] },
            howToViewersFlat: [Uid.viewer],
        },
    );
}

function howToFor(scenario: Scenario): HowTo {
    const data: HowToDocument = {
        v: 5,
        id: 'howto',
        galleryId: 'gallery',
        published: scenario.howTo.published,
        publishedAt: scenario.howTo.published ? 1 : null,
        xcoord: 0,
        ycoord: 0,
        title: '¶How-to¶/en-US',
        guidingQuestions: [],
        text: ['¶Body¶/en-US'],
        creator: Uid.owner,
        collaborators: [Uid.collaborator],
        scopeOverwrite: scenario.howTo.scopeOverwrite,
        locales: ['en-US'],
        isPublic: scenario.howTo.isPublic,
        submittedToGuide: false,
        moderation: 'unrequested',
        moderatedAt: null,
        flags: unknownFlags(),
        reposts: [],
        repostReaders: [],
        repostedPublicly: false,
        repostPlacements: {},
        social: {
            v: 1,
            notifySubscribers: true,
            reactionOptions: {},
            reactions: {},
            usedByProjects: [],
            chat: null,
            bookmarkers: [],
            seenByUsers: [],
            viewCount: 0,
        },
    };
    return new HowTo(data);
}

/** The predicate behind each action the client actually gates on. */
function ask(
    action: Exclude<Action, 'read'>,
    howTo: HowTo,
    gallery: Gallery,
    uid: string | undefined,
): boolean {
    switch (action) {
        case 'edit':
            return canEditHowTo(howTo, gallery, uid);
        case 'delete':
            return canDeleteHowTo(howTo, gallery, uid);
        case 'move':
            return canMoveHowTo(howTo, gallery, uid);
        case 'social':
            return canInteractSocially(howTo, gallery, uid);
        case 'submit':
            return canSubmitToGuide(howTo, gallery, uid);
    }
}

const clientActors = Actors.filter((a) => !ServerOnlyActors.includes(a));
const clientActions = Actions.filter(
    (a): a is Exclude<Action, 'read'> => !ServerOnlyActions.includes(a),
);

describe.each(Scenarios)('$name', (scenario) => {
    const howTo = howToFor(scenario);
    const gallery = galleryFor(scenario);

    test.each(clientActors)('%s', (actor) => {
        const uid = actor === 'anon' ? undefined : Uid[actor];
        const verdicts = clientActions.map(
            (action) => `${action}: ${ask(action, howTo, gallery, uid)}`,
        );
        expect(verdicts).toEqual(
            clientActions.map(
                (action) => `${action}: ${permits(scenario, actor, action)}`,
            ),
        );
    });
});

describe('creating a how-to and configuring the space', () => {
    const gallery = galleryFor(must(Scenarios[0], 'the first scenario'));

    test.each(clientActors)('%s', (actor) => {
        const uid = actor === 'anon' ? undefined : Uid[actor];
        const allowed = GalleryPermissions[actor] ?? [];
        expect({
            create: canCreateHowTo(gallery, uid),
            configure: canConfigureHowToSpace(gallery, uid),
        }).toEqual({
            create: allowed.includes('create'),
            configure: allowed.includes('configure'),
        });
    });

    test('nobody at all when the gallery has not loaded', () => {
        expect(canCreateHowTo(undefined, Uid.curator)).toBe(false);
        expect(canConfigureHowToSpace(undefined, Uid.curator)).toBe(false);
    });
});

describe('reposting (#1065)', () => {
    const RepostUid: Record<RepostActor, string> = {
        owner: Uid.owner,
        curator: Uid.curator,
        destinationCurator: 'destination-curator-uid',
        destinationCreator: 'destination-creator-uid',
        stranger: Uid.stranger,
    };

    function galleryOf(id: string, curators: string[], creators: string[]) {
        return Gallery.make(
            id,
            { 'en-US': id },
            { 'en-US': '' },
            curators,
            creators,
        );
    }

    const home = galleryOf('gallery', [Uid.curator], [Uid.galleryCreator]);
    const destination = galleryOf(
        'destination',
        [RepostUid.destinationCurator],
        [RepostUid.destinationCreator],
    );

    function reposted(published: boolean, over: Partial<HowToDocument> = {}) {
        const base = howToFor(must(Scenarios[0], 'the first scenario'));
        return new HowTo({
            ...base.getData(),
            published,
            reposts: ['destination'],
            repostReaders: [
                RepostUid.destinationCreator,
                RepostUid.destinationCurator,
            ].sort(),
            ...over,
        });
    }

    function ask(
        action: Exclude<RepostAction, 'read'>,
        howTo: HowTo,
        uid: string,
    ) {
        switch (action) {
            case 'edit':
                return canEditHowTo(howTo, home, uid);
            case 'delete':
                return canDeleteHowTo(howTo, home, uid);
            case 'moveHere':
                return canMoveHowTo(howTo, destination, uid);
            case 'social':
                return canInteractSocially(howTo, home, uid);
        }
    }

    const actions = RepostActions.filter(
        (a): a is Exclude<RepostAction, 'read'> => a !== 'read',
    );

    describe.each(RepostScenarios)('$name', (scenario) => {
        const howTo = reposted(scenario.published);
        test.each(RepostActors)('%s', (actor) => {
            const uid = RepostUid[actor];
            expect(
                actions.map(
                    (action) => `${action}: ${ask(action, howTo, uid)}`,
                ),
            ).toEqual(
                actions.map(
                    (action) =>
                        `${action}: ${scenario.allowed[actor].includes(action)}`,
                ),
            );
        });
    });

    test('an editor who curates the destination may repost there', () => {
        const unposted = reposted(true, { reposts: [], repostReaders: [] });
        const curatesBoth = galleryOf('destination', [Uid.owner], []);
        expect(canRepostHowTo(unposted, home, curatesBoth, Uid.owner)).toBe(
            true,
        );
        // Not someone who merely belongs to it,
        const createsThere = galleryOf('destination', [], [Uid.owner]);
        expect(canRepostHowTo(unposted, home, createsThere, Uid.owner)).toBe(
            false,
        );
        // nor a curator of it who cannot edit the how-to,
        expect(
            canRepostHowTo(
                unposted,
                home,
                destination,
                RepostUid.destinationCurator,
            ),
        ).toBe(false);
        // nor into its own home, a draft, or a gallery it is already in.
        const ownHome = galleryOf('gallery', [Uid.owner], []);
        expect(canRepostHowTo(unposted, home, ownHome, Uid.owner)).toBe(false);
        expect(
            canRepostHowTo(
                reposted(false, { reposts: [] }),
                home,
                curatesBoth,
                Uid.owner,
            ),
        ).toBe(false);
        expect(
            canRepostHowTo(reposted(true), home, curatesBoth, Uid.owner),
        ).toBe(false);
    });

    test('stops at the cap the rules can place', () => {
        const full = reposted(true, {
            reposts: Array.from({ length: MaxHowToReposts }, (_, i) => `g${i}`),
        });
        const another = galleryOf('another', [Uid.owner], []);
        expect(canRepostHowTo(full, home, another, Uid.owner)).toBe(false);
    });

    test('offers only the galleries it could go to', () => {
        const mine = galleryOf('mine', [Uid.owner], []);
        const theirs = galleryOf('theirs', [Uid.stranger], []);
        expect(
            repostDestinations(
                reposted(true, { reposts: [] }),
                home,
                [mine, theirs, home],
                Uid.owner,
            ).map((g) => g.getID()),
        ).toEqual(['mine']);
    });

    test("the destination's curators and the how-to's editors may take it back", () => {
        const howTo = reposted(true);
        expect(
            canUnrepostHowTo(
                howTo,
                home,
                destination,
                RepostUid.destinationCurator,
            ),
        ).toBe(true);
        expect(canUnrepostHowTo(howTo, home, destination, Uid.owner)).toBe(
            true,
        );
        expect(
            canUnrepostHowTo(
                howTo,
                home,
                destination,
                RepostUid.destinationCreator,
            ),
        ).toBe(false);
        expect(canUnrepostHowTo(howTo, home, home, Uid.curator)).toBe(false);
    });

    test('everyone a repost lets in joins the conversation', () => {
        expect(howToChatParticipants(reposted(true), home)).toEqual(
            expect.arrayContaining([
                RepostUid.destinationCurator,
                RepostUid.destinationCreator,
                Uid.curator,
                Uid.owner,
            ]),
        );
    });
});
