import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    RepostActions,
    RepostActors,
    RepostScenarios,
    type RepostAction,
    type RepostActor,
    type RepostScenario,
} from '../../src/db/howtos/howToAccessScenarios';

/**
 * Security rules for reposted how-tos (#1065): the server half of the table in
 * `howToAccessScenarios.ts`, plus what only the server can be asked — that the
 * fields the read rule trusts cannot be written by a client, and that a query
 * across how-tos from many home galleries is admitted without a get() of any.
 */

const Users: Record<RepostActor, string> = {
    owner: 'rulestest-repost-owner',
    curator: 'rulestest-repost-curator',
    destinationCurator: 'rulestest-repost-dcurator',
    destinationCreator: 'rulestest-repost-dcreator',
    stranger: 'rulestest-repost-stranger',
};

const Home = 'rulestest-repost-home';
const Destination = 'rulestest-repost-destination';
const HowToID = 'rulestest-repost-howto';

let env: RulesTestEnvironment;

function as(uid: string | undefined) {
    return uid === undefined
        ? env.unauthenticatedContext().firestore()
        : env.authenticatedContext(uid).firestore();
}

const social = (reactor: string) => ({
    v: 1,
    notifySubscribers: true,
    reactionOptions: { '👍': 'like' },
    reactions: { '👍': [reactor] },
    usedByProjects: [],
    chat: null,
    bookmarkers: [reactor],
    seenByUsers: [],
    viewCount: 1,
});

function gallery(id: string, curators: string[], creators: string[]) {
    return {
        v: 3,
        id,
        path: null,
        name: { 'en-US': id },
        description: { 'en-US': '' },
        words: [],
        curators,
        creators,
        projects: [],
        characters: [],
        public: false,
        moderation: {},
        howTos: [HowToID],
        howToExpandedVisibility: false,
        howToExpandedGalleries: [],
        howToViewers: {},
        howToViewersFlat: [],
        howToGuidingQuestions: [],
        howToReactions: {},
    };
}

function howTo(
    id: string,
    home: string,
    published: boolean,
    over: Record<string, unknown> = {},
) {
    return {
        v: 5,
        id,
        galleryId: home,
        published,
        publishedAt: published ? 1 : null,
        xcoord: 0,
        ycoord: 0,
        title: '¶Reposted¶/en-US',
        guidingQuestions: [],
        text: ['¶Body¶/en-US'],
        creator: Users.owner,
        collaborators: [],
        scopeOverwrite: false,
        locales: ['en-US'],
        isPublic: false,
        submittedToGuide: false,
        moderation: 'unrequested',
        moderatedAt: null,
        flags: {},
        reposts: [Destination],
        repostReaders: [
            Users.destinationCreator,
            Users.destinationCurator,
        ].sort(),
        repostedPublicly: false,
        repostPlacements: { [Destination]: { x: 0, y: 0 } },
        social: social(Users.owner),
        ...over,
    };
}

async function reset(scenario: RepostScenario) {
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db
            .doc(`galleries/${Home}`)
            .set(gallery(Home, [Users.curator], []));
        await db
            .doc(`galleries/${Destination}`)
            .set(
                gallery(
                    Destination,
                    [Users.destinationCurator],
                    [Users.destinationCreator],
                ),
            );
        await db
            .doc(`howtos/${HowToID}`)
            .set(howTo(HowToID, Home, scenario.published));
    });
}

function attempt(actor: RepostActor, action: RepostAction): Promise<unknown> {
    const doc = as(Users[actor]).doc(`howtos/${HowToID}`);
    switch (action) {
        case 'read':
            return doc.get();
        case 'edit':
            return doc.update({ title: '¶Edited¶/en-US' });
        // One key of the map, by path, as HowToDatabase.moveRepost writes it.
        case 'moveHere':
            return doc.update(`repostPlacements.${Destination}`, {
                x: 5,
                y: 5,
            });
        case 'social':
            return doc.update({ social: social(Users[actor]) });
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

describe.each(RepostScenarios)('$name', (scenario) => {
    beforeEach(() => reset(scenario));

    it.each(RepostActors)('%s', async (actor) => {
        const failures: string[] = [];
        for (const action of RepostActions) {
            const allowed = scenario.allowed[actor].includes(action);
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

describe('what the read rule trusts is the server’s alone', () => {
    beforeEach(() => reset(RepostScenarios[0] ?? missing()));

    it.each([
        ['reposts', [Destination, 'elsewhere']],
        ['repostReaders', [Users.stranger]],
        ['repostedPublicly', true],
    ] as const)('not even the owner may write %s', async (field, value) => {
        await assertFails(
            as(Users.owner)
                .doc(`howtos/${HowToID}`)
                .update({ [field]: value }),
        );
    });

    it('nor may a new how-to arrive already reposted', async () => {
        await assertFails(
            as(Users.curator)
                .doc('howtos/rulestest-repost-new')
                .set(howTo('rulestest-repost-new', Home, false)),
        );
    });

    it('a placement must be a point', async () => {
        await assertFails(
            as(Users.destinationCurator)
                .doc(`howtos/${HowToID}`)
                .update(`repostPlacements.${Destination}`, { x: 'far' }),
        );
        await assertFails(
            as(Users.destinationCurator)
                .doc(`howtos/${HowToID}`)
                .update(`repostPlacements.${Destination}`, {
                    x: 1,
                    y: 2,
                    z: 3,
                }),
        );
    });

    it("and only in a gallery it was reposted into, by that gallery's members", async () => {
        await assertFails(
            as(Users.destinationCurator)
                .doc(`howtos/${HowToID}`)
                .update(`repostPlacements.${Home}`, { x: 1, y: 2 }),
        );
        await assertFails(
            as(Users.curator)
                .doc(`howtos/${HowToID}`)
                .update(`repostPlacements.${Destination}`, { x: 1, y: 2 }),
        );
    });
});

describe('a query, not a document get', () => {
    /** More home galleries than the emulator's get() budget of 20, so a query
     *  that needed one get() per home would be denied as a whole. */
    const Homes = Array.from(
        { length: 21 },
        (_, i) => `rulestest-repost-home-${i}`,
    );

    beforeAll(async () => {
        await env.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            for (const [i, home] of Homes.entries()) {
                await db
                    .doc(`galleries/${home}`)
                    .set(gallery(home, [`someone-${i}`], []));
                await db
                    .doc(`howtos/rulestest-repost-many-${i}`)
                    .set(howTo(`rulestest-repost-many-${i}`, home, true));
            }
            // A draft reposted too, which only the published filter excludes.
            await db
                .doc('howtos/rulestest-repost-draft')
                .set(howTo('rulestest-repost-draft', Homes[0] ?? '', false));
        });
    });

    it('a reader finds every repost they are let into, across many homes', async () => {
        const result = await assertSucceeds(
            as(Users.destinationCreator)
                .collection('howtos')
                .where(
                    'repostReaders',
                    'array-contains',
                    Users.destinationCreator,
                )
                .where('published', '==', true)
                .get(),
        );
        expect(result.size).toBeGreaterThanOrEqual(Homes.length);
    });

    it('but not without the published filter', async () => {
        await assertFails(
            as(Users.destinationCreator)
                .collection('howtos')
                .where(
                    'repostReaders',
                    'array-contains',
                    Users.destinationCreator,
                )
                .get(),
        );
    });

    it('a visitor finds what was reposted into a public gallery', async () => {
        await env.withSecurityRulesDisabled(async (context) => {
            await context
                .firestore()
                .doc('howtos/rulestest-repost-public')
                .set(
                    howTo('rulestest-repost-public', Homes[1] ?? '', true, {
                        reposts: ['rulestest-repost-public-gallery'],
                        repostedPublicly: true,
                    }),
                );
        });
        const result = await assertSucceeds(
            as(undefined)
                .collection('howtos')
                .where(
                    'reposts',
                    'array-contains',
                    'rulestest-repost-public-gallery',
                )
                .where('repostedPublicly', '==', true)
                .where('published', '==', true)
                .get(),
        );
        expect(result.docs.map((d) => d.id)).toEqual([
            'rulestest-repost-public',
        ]);
    });
});

function missing(): never {
    throw new Error('No repost scenario');
}
