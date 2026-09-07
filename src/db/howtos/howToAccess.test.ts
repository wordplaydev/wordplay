import { describe, expect, test, vi } from 'vitest';

// `HowToDatabase.svelte.ts` reaches `@db/Database` for the singleton, which
// constructs every domain database at import — the same circular import
// `HowToDatabase.test.ts` mocks around. Only the `HowTo` wrapper class is under
// test here, and it needs none of it.
vi.mock('@db/firebase', () => ({ firestore: undefined }));
vi.mock('@db/Database', () => ({}));

import Gallery from '@db/galleries/Gallery';
import HowTo, { type HowToDocument } from './HowToDatabase.svelte';
import {
    canConfigureHowToSpace,
    canCreateHowTo,
    canDeleteHowTo,
    canEditHowTo,
    canInteractSocially,
    canMoveHowTo,
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
} from './howToAccessScenarios';

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
        v: 3,
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
        social: {
            v: 1,
            notifySubscribers: true,
            reactionOptions: {},
            reactions: {},
            usedByProjects: [],
            chat: null,
            bookmarkers: [],
            submittedToGuide: false,
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
    const gallery = galleryFor(Scenarios[0]);

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
