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

const Projects = {
    Public: 'rulestest-mod-public',
    /** Owned by the banned creator, and private. */
    Banned: 'rulestest-mod-banned',
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
        });
    });
});

afterAll(async () => {
    await env.cleanup();
});

describe('reports: anyone signed in may raise one, only moderators may read', () => {
    const runID = Date.now().toString(36);

    it('a signed-in viewer can report a project as themselves', async () => {
        await assertSucceeds(
            as(Users.Stranger).doc(`reports/report-${runID}-ok`).set({
                project: Projects.Public,
                reporter: Users.Stranger,
                time: 1,
                resolved: false,
            }),
        );
    });

    it('nobody can report in someone else’s name', async () => {
        await assertFails(
            as(Users.Stranger).doc(`reports/report-${runID}-forged`).set({
                project: Projects.Public,
                reporter: Users.Owner,
                time: 1,
                resolved: false,
            }),
        );
    });

    it('a report cannot arrive already resolved', async () => {
        // Resolution is a moderator's word, not the reporter's.
        await assertFails(
            as(Users.Stranger).doc(`reports/report-${runID}-preresolved`).set({
                project: Projects.Public,
                reporter: Users.Stranger,
                time: 1,
                resolved: true,
            }),
        );
    });

    it('a report is not readable by the reporter, the creator, or a stranger', async () => {
        // A report is a request for review, not a public accusation.
        for (const uid of [Users.Stranger, Users.Owner, Users.Banned])
            await assertFails(as(uid).doc(`reports/report-${runID}-ok`).get());
    });

    it('a moderator can read and resolve reports', async () => {
        const mod = as(Users.Mod, { mod: true });
        await assertSucceeds(mod.doc(`reports/report-${runID}-ok`).get());
        await assertSucceeds(
            mod.doc(`reports/report-${runID}-ok`).update({ resolved: true }),
        );
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
