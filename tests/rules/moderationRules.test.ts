import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, describe, it } from 'vitest';

/**
 * Security-rules tests for #193: reporting public content, the moderation
 * record it can lead to, and the loss of public sharing that record enforces.
 *
 * The load-bearing claim under test is that the ban is enforced by the token
 * rather than by reading anything — so these run a context with the `banned`
 * claim and check exactly what it can and can't write.
 */

const Users = {
    Owner: 'rulestest-mod-owner',
    Banned: 'rulestest-banned',
    Stranger: 'rulestest-mod-stranger',
    Mod: 'rulestest-mod-mod',
};

const Galleries = {
    /** Awaiting a decision, and private while it waits. */
    Pending: 'rulestest-mod-gallery-pending',
};

const Projects = {
    Public: 'rulestest-mod-public',
    /** Owned by the banned creator, and private. */
    Banned: 'rulestest-mod-banned',
    /** Someone else's, already public, with the banned creator collaborating. */
    Shared: 'rulestest-mod-public-shared',
};

let env: RulesTestEnvironment;

function as(uid: string, claims?: Record<string, unknown>) {
    return env.authenticatedContext(uid, claims).firestore();
}

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-wordplay',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc(`projects/${Projects.Public}`).set({
            owner: Users.Owner,
            collaborators: [],
            commenters: [],
            viewers: [],
            public: true,
            gallery: null,
            researchConsent: false,
        });
        await db.doc(`projects/${Projects.Banned}`).set({
            owner: Users.Banned,
            collaborators: [],
            commenters: [],
            viewers: [],
            public: false,
            gallery: null,
            researchConsent: false,
        });
        await db.doc(`projects/${Projects.Shared}`).set({
            owner: Users.Owner,
            collaborators: [Users.Banned],
            commenters: [],
            viewers: [],
            public: true,
            gallery: null,
            researchConsent: false,
        });
        await db.doc(`strikes/${Users.Owner}`).set({
            v: 1,
            count: 1,
            strikes: [],
            banned: false,
            bannedAt: null,
        });
        await db.doc(`galleries/rulestest-mod-gallery`).set({
            public: false,
            curators: [Users.Banned],
            creators: [],
            moderation: 'unrequested',
            moderatedAt: null,
            flags: {
                dehumanization: null,
                violence: null,
                disclosure: null,
                misinformation: null,
            },
            words: [],
        });
        // A gallery in the queue: private, so only its curator and a moderator
        // can see it at all.
        await db.doc(`galleries/${Galleries.Pending}`).set({
            public: false,
            curators: [Users.Owner],
            creators: [],
            moderation: 'pending',
            moderatedAt: null,
            flags: {
                dehumanization: null,
                violence: null,
                disclosure: null,
                misinformation: null,
            },
            words: [],
        });
    });
});

afterAll(async () => {
    await env.cleanup();
});

describe('reports: nobody writes one, and only the responsible may read', () => {
    const runID = Date.now().toString(36);
    const Curated = `report-${runID}-curated`;
    const Platform = `report-${runID}-platform`;

    beforeAll(async () => {
        // Seeded past the rules, because after #938 no client may write one:
        // the `report` and `moderate` callables own this collection.
        await env.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await db.doc(`reports/${Curated}`).set({
                v: 2,
                kind: 'chat',
                subject: 'some-chat',
                message: 'm1',
                gallery: Galleries.Pending,
                moderators: [Users.Owner],
                platform: false,
                author: Users.Banned,
                reporters: [Users.Stranger],
                time: 1,
                resolved: false,
            });
            await db.doc(`reports/${Platform}`).set({
                v: 2,
                kind: 'project',
                subject: Projects.Public,
                gallery: null,
                moderators: [],
                platform: true,
                author: Users.Owner,
                reporters: [Users.Stranger],
                time: 1,
                resolved: false,
            });
        });
    });

    it('nobody can raise one directly any more, not even naming themselves', async () => {
        // A reporter who could write this would be naming their own reviewers,
        // which is the same mistake as a creator clearing their own strikes.
        await assertFails(
            as(Users.Stranger)
                .doc(`reports/${runID}-forged`)
                .set({
                    v: 2,
                    kind: 'project',
                    subject: Projects.Public,
                    gallery: null,
                    moderators: [],
                    platform: true,
                    author: Users.Owner,
                    reporters: [Users.Stranger],
                    time: 1,
                    resolved: false,
                }),
        );
    });

    it('not even a moderator can write one', async () => {
        await assertFails(
            as(Users.Mod, { mod: true })
                .doc(`reports/${Platform}`)
                .update({ resolved: true }),
        );
    });

    it('the reporter cannot read the report they filed', async () => {
        // A report is a request for review, not a public accusation.
        await assertFails(as(Users.Stranger).doc(`reports/${Platform}`).get());
    });

    it('nor can the author it is about', async () => {
        await assertFails(as(Users.Owner).doc(`reports/${Platform}`).get());
        await assertFails(as(Users.Banned).doc(`reports/${Curated}`).get());
    });

    it('a moderator reads what the platform is responsible for', async () => {
        await assertSucceeds(
            as(Users.Mod, { mod: true }).doc(`reports/${Platform}`).get(),
        );
    });

    it("but not a private gallery's own business", async () => {
        // A classroom's moderation is its curators', not the platform's.
        await assertFails(
            as(Users.Mod, { mod: true }).doc(`reports/${Curated}`).get(),
        );
    });

    it('a curator reads the reports routed to them', async () => {
        await assertSucceeds(as(Users.Owner).doc(`reports/${Curated}`).get());
    });

    it('and a curator of some other gallery does not', async () => {
        await assertFails(as(Users.Banned).doc(`reports/${Curated}`).get());
    });

    it('a curator can list their queue without a get() of the gallery', async () => {
        // The whole reason `moderators` is denormalized: rules allow only ~10
        // document accesses per query, so a join here would deny the query
        // outright once a curator had more galleries than that budget.
        await assertSucceeds(
            as(Users.Owner)
                .collection('reports')
                .where('moderators', 'array-contains', Users.Owner)
                .where('resolved', '==', false)
                .orderBy('time')
                .get(),
        );
    });

    it('a legacy v1 report is returned by neither queue', async () => {
        await env.withSecurityRulesDisabled(async (context) => {
            await context.firestore().doc(`reports/${runID}-legacy`).set({
                project: Projects.Public,
                reporter: Users.Stranger,
                time: 1,
                resolved: false,
            });
        });
        // It carries neither indexed field, so it can't match — which is why
        // ReportMigration.js has to run, and why running it late loses a
        // report rather than exposing one.
        const queue = await as(Users.Mod, { mod: true })
            .collection('reports')
            .where('platform', '==', true)
            .where('resolved', '==', false)
            .get();
        if (queue.docs.some((doc) => doc.id === `${runID}-legacy`))
            throw new Error('a v1 report should not appear in the new queue');
    });
});

describe('strikes: server-written, readable by its subject and moderators', () => {
    it('a creator can read their own record', async () => {
        await assertSucceeds(
            as(Users.Owner).doc(`strikes/${Users.Owner}`).get(),
        );
    });

    it('a creator cannot read someone else’s', async () => {
        await assertFails(as(Users.Banned).doc(`strikes/${Users.Owner}`).get());
    });

    it('a moderator can read anyone’s', async () => {
        await assertSucceeds(
            as(Users.Mod, { mod: true }).doc(`strikes/${Users.Owner}`).get(),
        );
    });

    it('nobody can write one — not the subject, not a moderator', async () => {
        // A creator who could write this could clear their own strikes; the
        // callable writes it with the Admin SDK instead.
        await assertFails(
            as(Users.Owner).doc(`strikes/${Users.Owner}`).set({
                v: 1,
                count: 0,
                strikes: [],
                banned: false,
                bannedAt: null,
            }),
        );
        await assertFails(
            as(Users.Mod, { mod: true })
                .doc(`strikes/${Users.Owner}`)
                .update({ count: 0 }),
        );
    });
});

describe('a banned creator keeps everything except publishing', () => {
    it('cannot make one of their projects public', async () => {
        await assertFails(
            as(Users.Banned, { banned: true })
                .doc(`projects/${Projects.Banned}`)
                .update({ public: true }),
        );
    });

    it('cannot create a project that starts out public', async () => {
        await assertFails(
            as(Users.Banned, { banned: true })
                .doc(`projects/rulestest-mod-new-public`)
                .set({
                    owner: Users.Banned,
                    collaborators: [],
                    commenters: [],
                    viewers: [],
                    public: true,
                    gallery: null,
                }),
        );
    });

    it('can still edit, and can still create private projects', async () => {
        // The point is losing an audience, not losing the app.
        const banned = as(Users.Banned, { banned: true });
        await assertSucceeds(
            banned.doc(`projects/${Projects.Banned}`).update({ timestamp: 5 }),
        );
        await assertSucceeds(
            banned.doc(`projects/rulestest-mod-new-private`).set({
                owner: Users.Banned,
                collaborators: [],
                commenters: [],
                viewers: [],
                public: false,
                gallery: null,
            }),
        );
    });

    it('can still edit a public project someone else owns', async () => {
        // A ban takes away making things public, not touching anything that
        // already is. Checking the new value alone locked a banned creator out
        // of every public document they collaborate on or curate.
        await assertSucceeds(
            as(Users.Banned, { banned: true })
                .doc(`projects/${Projects.Shared}`)
                .update({ timestamp: 7 }),
        );
    });

    it('still cannot re-publish that project after un-publishing it', async () => {
        const banned = as(Users.Banned, { banned: true });
        await assertSucceeds(
            banned.doc(`projects/${Projects.Shared}`).update({ public: false }),
        );
        await assertFails(
            banned.doc(`projects/${Projects.Shared}`).update({ public: true }),
        );
        await env.withSecurityRulesDisabled(async (context) => {
            await context
                .firestore()
                .doc(`projects/${Projects.Shared}`)
                .update({ public: true });
        });
    });

    it('cannot publish a gallery they curate', async () => {
        await assertFails(
            as(Users.Banned, { banned: true })
                .doc('galleries/rulestest-mod-gallery')
                .update({ public: true }),
        );
    });

    it('the same creator without the claim can do all three', async () => {
        const ok = as(Users.Banned);
        await assertSucceeds(
            ok.doc(`projects/${Projects.Banned}`).update({ public: true }),
        );
        await assertSucceeds(
            ok.doc('galleries/rulestest-mod-gallery').update({ public: true }),
        );
        // Put the fixtures back for a rerun against a long-lived emulator.
        await env.withSecurityRulesDisabled(async (context) => {
            await context
                .firestore()
                .doc(`projects/${Projects.Banned}`)
                .update({ public: false });
            await context
                .firestore()
                .doc('galleries/rulestest-mod-gallery')
                .update({ public: false });
        });
    });
});

/**
 * Curated public listing (#1311). `public` is the curator's request and stays
 * theirs to write; `moderation` is the decision, and no client may write it —
 * a curator who could approve their own gallery is the whole thing curation
 * prevents. The function that does write it uses the Admin SDK, which bypasses
 * these rules entirely, so there is nothing here that grants it.
 */
describe("galleries: the moderation decision is not the curator's to write", () => {
    const gallery = 'galleries/rulestest-mod-gallery';

    it('a curator may still ask, by making their gallery public', async () => {
        await assertSucceeds(
            as(Users.Banned).doc(gallery).update({ public: true }),
        );
        await env.withSecurityRulesDisabled(async (context) => {
            await context.firestore().doc(gallery).update({ public: false });
        });
    });

    it('a curator may still rename their gallery', async () => {
        await assertSucceeds(
            as(Users.Banned)
                .doc(gallery)
                .update({ name: { 'en-US': 'Mine' } }),
        );
    });

    it('a curator cannot approve their own gallery', async () => {
        await assertFails(
            as(Users.Banned).doc(gallery).update({ moderation: 'approved' }),
        );
    });

    it('a curator cannot clear the findings against their gallery', async () => {
        await assertFails(
            as(Users.Banned)
                .doc(gallery)
                .update({
                    flags: {
                        dehumanization: false,
                        violence: false,
                        disclosure: false,
                        misinformation: false,
                    },
                }),
        );
    });

    it('a curator cannot backdate a decision', async () => {
        await assertFails(
            as(Users.Banned).doc(gallery).update({ moderatedAt: 0 }),
        );
    });

    it('a curator cannot stuff the search index', async () => {
        await assertFails(
            as(Users.Banned)
                .doc(gallery)
                .update({ words: ['free', 'money'] }),
        );
    });

    it('nor can a moderator write the decision directly', async () => {
        // Even the mod claim goes through the callable: the rules grant reads,
        // not decisions.
        await assertFails(
            as(Users.Mod, { mod: true })
                .doc(gallery)
                .update({ moderation: 'approved' }),
        );
    });

    it('a moderator can read a private gallery awaiting a decision', async () => {
        await assertSucceeds(
            as(Users.Mod, { mod: true })
                .doc(`galleries/${Galleries.Pending}`)
                .get(),
        );
    });

    it('but a stranger still cannot', async () => {
        await assertFails(
            as(Users.Stranger).doc(`galleries/${Galleries.Pending}`).get(),
        );
    });
});
