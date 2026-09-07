import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    Actions,
    Actors,
    GalleryPermissions,
    permits,
    Scenarios,
    type Action,
    type Actor,
    type Scenario,
} from '../../src/db/howtos/howToAccessScenarios';

/**
 * Security-rules tests for how-tos — the first they have ever had, and the
 * reason #907 stayed open. The permission model shipped in #882 is a checklist
 * of who may read, edit, move, react to and delete a how-to, and until now every
 * line of it was enforced only by rules nothing exercised.
 *
 * The matrix itself lives in `src/db/howtos/howToAccessScenarios.ts` so that the
 * client's own predicates are held to the same table (see `howToAccess.test.ts`).
 * This file is the server half.
 */

const Users: Record<Exclude<Actor, 'anon'>, string> = {
    owner: 'rulestest-howto-owner',
    collaborator: 'rulestest-howto-collaborator',
    curator: 'rulestest-howto-curator',
    galleryCreator: 'rulestest-howto-gallerycreator',
    viewer: 'rulestest-howto-viewer',
    stranger: 'rulestest-howto-stranger',
    mod: 'rulestest-howto-mod',
};

const Gallery = 'rulestest-howto-gallery';
const HowTo = 'rulestest-howto';
/** The document the create tests make, deleted before each of them. */
const New = 'rulestest-howto-new';

let env: RulesTestEnvironment;

/** The uid `actor` acts under; `anon` has none, so a stand-in for fixture data. */
function uidOf(actor: Actor): string {
    return actor === 'anon' ? 'rulestest-howto-anonymous' : Users[actor];
}

/** A Firestore handle acting as `actor`, unauthenticated for `anon`. */
function as(actor: Actor) {
    if (actor === 'anon') return env.unauthenticatedContext().firestore();
    if (actor === 'mod')
        return env.authenticatedContext(Users.mod, { mod: true }).firestore();
    return env.authenticatedContext(Users[actor]).firestore();
}

const social = (reactor: string) => ({
    v: 1,
    notifySubscribers: true,
    reactionOptions: { '👍': 'like' },
    reactions: { '👍': [reactor] },
    usedByProjects: [],
    chat: null,
    bookmarkers: [reactor],
    submittedToGuide: false,
    seenByUsers: [],
    viewCount: 1,
});

/** Rebuild both documents in the shape this scenario describes. */
async function reset(scenario: Scenario) {
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc(`galleries/${Gallery}`).set({
            v: 3,
            id: Gallery,
            path: null,
            name: { 'en-US': 'Rules test gallery' },
            description: { 'en-US': '' },
            words: [],
            curators: [Users.curator],
            creators: [Users.galleryCreator],
            projects: [],
            characters: [],
            public: scenario.gallery.public,
            moderation: {},
            howTos: [HowTo],
            howToExpandedVisibility: scenario.gallery.expandedVisibility,
            howToExpandedGalleries: [],
            howToViewers: { 'rulestest-source-gallery': [Users.viewer] },
            howToViewersFlat: [Users.viewer],
            howToGuidingQuestions: [],
            howToReactions: {},
        });
        await db.doc(`howtos/${HowTo}`).set({
            v: 3,
            id: HowTo,
            galleryId: Gallery,
            published: scenario.howTo.published,
            publishedAt: scenario.howTo.published ? 1 : null,
            xcoord: 0,
            ycoord: 0,
            title: '¶Rules test how-to¶/en-US',
            guidingQuestions: [],
            text: ['¶Body¶/en-US'],
            creator: Users.owner,
            collaborators: [Users.collaborator],
            scopeOverwrite: scenario.howTo.scopeOverwrite,
            locales: ['en-US'],
            isPublic: scenario.howTo.isPublic,
            social: social(Users.owner),
        });
    });
}

/** The request each action makes, as the client makes it. */
function attempt(actor: Actor, action: Action): Promise<unknown> {
    const doc = as(actor).doc(`howtos/${HowTo}`);
    switch (action) {
        case 'read':
            return doc.get();
        // A title change touches no narrow opening, so only the full-edit
        // branches can admit it — which is what makes it the probe for `edit`.
        case 'edit':
            return doc.update({ title: '¶Edited¶/en-US' });
        case 'move':
            return doc.update({ xcoord: 5, ycoord: 5 });
        case 'social':
            return doc.update({ social: social(uidOf(actor)) });
        case 'delete':
            return doc.delete();
    }
}

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-wordplay',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
});

afterAll(async () => {
    await env.cleanup();
});

describe.each(Scenarios)('$name', (scenario) => {
    // Rebuilt per test: every actor's run writes, and a delete would otherwise
    // leave the next actor with nothing to act on.
    beforeEach(() => reset(scenario));

    // One test per actor rather than per action: each is a fresh fixture, and
    // 8 resets per scenario is the difference between a suite that runs in
    // seconds and one that runs in a minute.
    it.each(Actors)('%s', async (actor) => {
        const failures: string[] = [];
        for (const action of Actions) {
            const allowed = permits(scenario, actor, action);
            try {
                if (allowed) await assertSucceeds(attempt(actor, action));
                else await assertFails(attempt(actor, action));
            } catch (error) {
                failures.push(
                    `${action}: expected ${allowed ? 'allowed' : 'denied'} — ${error}`,
                );
            }
        }
        expect(failures, `${actor} on ${scenario.name}`).toEqual([]);
    });
});

describe('creating a how-to and configuring the space', () => {
    // The new how-to has to go as well as be rebuilt: left behind by whichever
    // actor was allowed to make it, the next actor's `set` is an *update*, and
    // the update rule answers a different question than the create rule.
    beforeEach(async () => {
        await reset(Scenarios[0]);
        await env.withSecurityRulesDisabled(async (context) => {
            await context.firestore().doc(`howtos/${New}`).delete();
        });
    });

    it.each(Actors)(
        '%s creates only if the gallery admits them',
        async (actor) => {
            const allowed = (GalleryPermissions[actor] ?? []).includes(
                'create',
            );
            const write = as(actor)
                .doc(`howtos/${New}`)
                .set({
                    v: 3,
                    id: New,
                    galleryId: Gallery,
                    published: false,
                    publishedAt: null,
                    xcoord: 0,
                    ycoord: 0,
                    title: '¶New¶/en-US',
                    guidingQuestions: [],
                    text: [],
                    creator: uidOf(actor),
                    collaborators: [],
                    scopeOverwrite: false,
                    locales: ['en-US'],
                    isPublic: false,
                    social: social('nobody'),
                });
            if (allowed) await assertSucceeds(write);
            else await assertFails(write);
        },
    );

    it('a create naming a gallery the caller does not belong to fails', async () => {
        await assertFails(
            as('stranger')
                .doc('howtos/rulestest-howto-elsewhere')
                .set({ galleryId: Gallery, creator: Users.stranger }),
        );
    });
});

describe('expanded access is a grant on the gallery, and it can be withdrawn', () => {
    it('a viewer may read the gallery while expanded visibility is on', async () => {
        await reset(Scenarios[4]);
        await assertSucceeds(as('viewer').doc(`galleries/${Gallery}`).get());
    });

    it('and may not once the curator switches it off', async () => {
        await reset(Scenarios[0]);
        await assertFails(as('viewer').doc(`galleries/${Gallery}`).get());
    });

    it('someone not on the list never may', async () => {
        await reset(Scenarios[4]);
        await assertFails(as('stranger').doc(`galleries/${Gallery}`).get());
    });
});

/**
 * Who may *make* the grant, as opposed to who it reaches. The switch and the
 * list of source galleries are the curator's request; the viewer lists derived
 * from them are the server's answer, written only by the `galleryEdited`
 * trigger. They were client-writable, so anyone who could edit the gallery
 * could hand it — and, since #1351, its published how-tos — to any uid they
 * named (#1352).
 */
describe('expanded access is asked for by the curator and answered by the server', () => {
    beforeEach(() => reset(Scenarios[4]));

    it('a curator may ask, by naming a gallery and turning the switch on', async () => {
        await assertSucceeds(
            as('curator')
                .doc(`galleries/${Gallery}`)
                .update({
                    howToExpandedVisibility: true,
                    howToExpandedGalleries: ['rulestest-howto-source-gallery'],
                }),
        );
    });

    it('but may not write the viewer list the answer consists of', async () => {
        await assertFails(
            as('curator')
                .doc(`galleries/${Gallery}`)
                .update({ howToViewersFlat: [Users.stranger] }),
        );
    });

    it('nor the map it is flattened from', async () => {
        await assertFails(
            as('curator')
                .doc(`galleries/${Gallery}`)
                .update({ howToViewers: { elsewhere: [Users.stranger] } }),
        );
    });

    it('and neither may a gallery creator, who can edit everything else', async () => {
        // A creator is barred from `public`, `curators` and `creators`, and from
        // nothing else — so in a class gallery this was any student.
        await assertFails(
            as('galleryCreator')
                .doc(`galleries/${Gallery}`)
                .update({ howToViewersFlat: [Users.stranger] }),
        );
    });
});

describe('a how-to cannot be captured by renaming its gallery', () => {
    // The escalation this closes: creating a gallery makes you its curator and
    // the gallery create rule is only `request.auth != null`, so authorizing an
    // update from `request.resource.data.galleryId` let any signed-in account
    // edit any how-to in the database by naming a gallery they had just made.
    beforeEach(async () => {
        await reset(Scenarios[0]);
        await env.withSecurityRulesDisabled(async (context) => {
            await context
                .firestore()
                .doc('galleries/rulestest-howto-stranger-gallery')
                .set({
                    curators: [Users.stranger],
                    creators: [Users.stranger],
                    public: false,
                    howToExpandedVisibility: false,
                    howToViewersFlat: [],
                });
        });
    });

    it('a stranger cannot edit by claiming their own gallery in the write', async () => {
        await assertFails(
            as('stranger').doc(`howtos/${HowTo}`).update({
                galleryId: 'rulestest-howto-stranger-gallery',
                title: '¶Captured¶/en-US',
            }),
        );
    });

    it('nor react to one they cannot otherwise see', async () => {
        await assertFails(
            as('stranger')
                .doc(`howtos/${HowTo}`)
                .update({
                    galleryId: 'rulestest-howto-stranger-gallery',
                    social: social(Users.stranger),
                }),
        );
    });

    it("a how-to's gallery is immutable even to its owner", async () => {
        // Nothing moves a how-to between galleries — `HowToMovement` is canvas
        // geometry — and a move that did would have to rewrite two galleries'
        // `howTos` arrays atomically, which is a callable's job, not a client
        // write's.
        await assertFails(
            as('owner')
                .doc(`howtos/${HowTo}`)
                .update({ galleryId: 'rulestest-howto-stranger-gallery' }),
        );
    });
});
