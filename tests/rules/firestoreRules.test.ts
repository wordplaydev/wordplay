/**
 * Security-rules tests for the `projects` collection and its `updates` and
 * `presence` subcollections, run against the Firestore emulator via
 * `npm run test:rules`.
 *
 * The invariant under test: subcollection read access is exactly parent
 * project read access (`canReadProject`), so gallery curators, gallery
 * creators, and viewers of public projects can follow the live collaboration
 * state of any project they can open — while write access stays limited to
 * those who can edit (owner, collaborators, and — for presence — gallery
 * curators, who can already update the project doc itself).
 */
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, describe, it } from 'vitest';

/** All docs live under these fixture IDs, seeded once with rules disabled. */
const Galleries = {
    Unrestricted: 'rulestest-gallery-unrestricted',
    Restricted: 'rulestest-gallery-restricted',
    Public: 'rulestest-gallery-public',
    Other: 'rulestest-gallery-other',
};

const Projects = {
    /** In Unrestricted gallery, restrictedGallery false. */
    Unrestricted: 'rulestest-project-unrestricted',
    /** In Restricted gallery, restrictedGallery true. */
    Restricted: 'rulestest-project-restricted',
    /** Public, in no gallery. */
    Public: 'rulestest-project-public',
    /** In Other gallery, which none of the test users curate. */
    OtherGallery: 'rulestest-project-other-gallery',
};

const Users = {
    Owner: 'rulestest-owner',
    Collaborator: 'rulestest-collaborator',
    Commenter: 'rulestest-commenter',
    Viewer: 'rulestest-viewer',
    /** Curator of Unrestricted, Restricted, and Public galleries. */
    Curator: 'rulestest-curator',
    /** Creator (classmate) in the Unrestricted and Restricted galleries. */
    Classmate: 'rulestest-classmate',
    Stranger: 'rulestest-stranger',
    Mod: 'rulestest-mod',
    OtherCurator: 'rulestest-other-curator',
};

let env: RulesTestEnvironment;

/** A firestore client authenticated as the given user, or anonymous. */
function as(uid: string | null) {
    if (uid === null) return env.unauthenticatedContext().firestore();
    if (uid === Users.Mod)
        return env.authenticatedContext(uid, { mod: true }).firestore();
    return env.authenticatedContext(uid).firestore();
}

function projectDoc(uid: string | null, project: string) {
    return as(uid).doc(`projects/${project}`);
}

function subDoc(uid: string | null, project: string, sub: string, id: string) {
    return as(uid).doc(`projects/${project}/${sub}/${id}`);
}

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-wordplay',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        // Galleries: real gallery docs always carry public/curators/creators,
        // and galleryGrantsRead reads them unguarded, so seed all three.
        await db.doc(`galleries/${Galleries.Unrestricted}`).set({
            public: false,
            curators: [Users.Curator],
            creators: [Users.Classmate],
        });
        await db.doc(`galleries/${Galleries.Restricted}`).set({
            public: false,
            curators: [Users.Curator],
            creators: [Users.Classmate],
        });
        await db.doc(`galleries/${Galleries.Public}`).set({
            public: true,
            curators: [Users.Curator],
            creators: [],
        });
        await db.doc(`galleries/${Galleries.Other}`).set({
            public: false,
            curators: [Users.OtherCurator],
            creators: [],
        });
        // Projects, each with one update and one presence doc.
        const roles = {
            owner: Users.Owner,
            collaborators: [Users.Collaborator],
            commenters: [Users.Commenter],
            viewers: [Users.Viewer],
            // Every v10 doc carries this, and the rule that protects it reads
            // both sides, so the fixtures have to carry it too.
            researchConsent: false,
        };
        await db.doc(`projects/${Projects.Unrestricted}`).set({
            ...roles,
            public: false,
            gallery: Galleries.Unrestricted,
            restrictedGallery: false,
        });
        await db.doc(`projects/${Projects.Restricted}`).set({
            ...roles,
            public: false,
            gallery: Galleries.Restricted,
            restrictedGallery: true,
        });
        await db.doc(`projects/${Projects.Public}`).set({
            ...roles,
            public: true,
            gallery: null,
        });
        await db.doc(`projects/${Projects.OtherGallery}`).set({
            owner: Users.Stranger,
            collaborators: [],
            commenters: [],
            viewers: [],
            public: false,
            gallery: Galleries.Other,
            restrictedGallery: false,
        });
        for (const project of Object.values(Projects)) {
            await db
                .doc(`projects/${project}/updates/update1`)
                .set({ writer: 'w1', update: 'AAAA' });
            await db
                .doc(`projects/${project}/presence/client1`)
                .set({ userID: Users.Owner, lastSeen: 0 });
        }
    });
});

afterAll(async () => {
    await env.cleanup();
});

describe('project doc read (regression matrix for the canReadProject refactor)', () => {
    it('public project readable by everyone including signed-out', async () => {
        for (const uid of [...Object.values(Users), null])
            await assertSucceeds(projectDoc(uid, Projects.Public).get());
    });
    it('unrestricted gallery project readable by all roles with access', async () => {
        for (const uid of [
            Users.Owner,
            Users.Collaborator,
            Users.Commenter,
            Users.Viewer,
            Users.Curator,
            Users.Classmate,
            Users.Mod,
        ])
            await assertSucceeds(projectDoc(uid, Projects.Unrestricted).get());
    });
    it('unrestricted gallery project not readable by stranger or signed-out', async () => {
        await assertFails(
            projectDoc(Users.Stranger, Projects.Unrestricted).get(),
        );
        await assertFails(projectDoc(null, Projects.Unrestricted).get());
    });
    it('restricted project readable by curator but not gallery classmate', async () => {
        await assertSucceeds(
            projectDoc(Users.Curator, Projects.Restricted).get(),
        );
        await assertFails(
            projectDoc(Users.Classmate, Projects.Restricted).get(),
        );
    });
    it('curator cannot read a project in a gallery they do not curate', async () => {
        await assertFails(
            projectDoc(Users.Curator, Projects.OtherGallery).get(),
        );
    });
});

for (const sub of ['updates', 'presence']) {
    describe(`${sub} read follows parent project read access`, () => {
        it(`curator reads ${sub} of unrestricted and restricted projects in their gallery`, async () => {
            await assertSucceeds(
                subDoc(
                    Users.Curator,
                    Projects.Unrestricted,
                    sub,
                    sub === 'updates' ? 'update1' : 'client1',
                ).get(),
            );
            await assertSucceeds(
                subDoc(
                    Users.Curator,
                    Projects.Restricted,
                    sub,
                    sub === 'updates' ? 'update1' : 'client1',
                ).get(),
            );
        });
        it(`curator cannot read ${sub} of a project in a gallery they do not curate`, async () => {
            await assertFails(
                subDoc(
                    Users.Curator,
                    Projects.OtherGallery,
                    sub,
                    sub === 'updates' ? 'update1' : 'client1',
                ).get(),
            );
        });
        it(`gallery classmate reads ${sub} of unrestricted but not restricted projects`, async () => {
            await assertSucceeds(
                subDoc(
                    Users.Classmate,
                    Projects.Unrestricted,
                    sub,
                    sub === 'updates' ? 'update1' : 'client1',
                ).get(),
            );
            await assertFails(
                subDoc(
                    Users.Classmate,
                    Projects.Restricted,
                    sub,
                    sub === 'updates' ? 'update1' : 'client1',
                ).get(),
            );
        });
        it(`stranger and signed-out read ${sub} of a public project only`, async () => {
            for (const uid of [Users.Stranger, null]) {
                await assertSucceeds(
                    subDoc(
                        uid,
                        Projects.Public,
                        sub,
                        sub === 'updates' ? 'update1' : 'client1',
                    ).get(),
                );
                await assertFails(
                    subDoc(
                        uid,
                        Projects.Unrestricted,
                        sub,
                        sub === 'updates' ? 'update1' : 'client1',
                    ).get(),
                );
            }
        });
        it(`owner, collaborator, commenter, viewer, and mod read ${sub} (regression)`, async () => {
            for (const uid of [
                Users.Owner,
                Users.Collaborator,
                Users.Commenter,
                Users.Viewer,
                Users.Mod,
            ])
                await assertSucceeds(
                    subDoc(
                        uid,
                        Projects.Unrestricted,
                        sub,
                        sub === 'updates' ? 'update1' : 'client1',
                    ).get(),
                );
        });
        it(`${sub} can be listed by a curator (collection query, not just get)`, async () => {
            await assertSucceeds(
                as(Users.Curator)
                    .collection(`projects/${Projects.Unrestricted}/${sub}`)
                    .get(),
            );
        });
    });
}

describe("research consent is the owner's alone to change", () => {
    // #922. Collaborators, curators, and moderators can all update a project
    // doc for other reasons. Consent permits Wordplay to show *the owner's*
    // work, so none of them may flip it — while their other edits must keep
    // working, or the clause would have broken ordinary collaboration.
    it('the owner can turn research consent on and off', async () => {
        await assertSucceeds(
            projectDoc(Users.Owner, Projects.Unrestricted).update({
                researchConsent: true,
            }),
        );
        await assertSucceeds(
            projectDoc(Users.Owner, Projects.Unrestricted).update({
                researchConsent: false,
            }),
        );
    });

    it('a collaborator, curator, and moderator cannot change it', async () => {
        for (const uid of [Users.Collaborator, Users.Curator, Users.Mod])
            await assertFails(
                projectDoc(uid, Projects.Unrestricted).update({
                    researchConsent: true,
                }),
            );
    });

    it('their other edits still succeed', async () => {
        for (const uid of [Users.Collaborator, Users.Curator, Users.Mod])
            await assertSucceeds(
                projectDoc(uid, Projects.Unrestricted).update({
                    timestamp: 1,
                }),
            );
    });
});

describe('a document missing a field is still writable', () => {
    // Reading a property that isn't on the document is a hard CEL evaluation
    // error, not a null — and it fails closed, so one unguarded access in a
    // helper blocks every save of a document that predates the field. That is
    // what canReadProject's `'X' in data` guards are for, and what the
    // ownership and consent clauses were missing: five of a creator's own
    // projects stopped saving with "Property owner is undefined on object".
    const runID = Date.now().toString(36);

    it('a project with no owner field can still be updated by a collaborator', async () => {
        const id = `rulestest-no-owner-${runID}`;
        await env.withSecurityRulesDisabled(async (context) => {
            await context
                .firestore()
                .doc(`projects/${id}`)
                .set({
                    collaborators: [Users.Collaborator],
                    commenters: [],
                    viewers: [],
                    public: false,
                    gallery: null,
                });
        });
        await assertSucceeds(
            projectDoc(Users.Collaborator, id).update({ timestamp: 1 }),
        );
    });

    it('a project with no public field can still be updated', async () => {
        const id = `rulestest-no-public-${runID}`;
        await env.withSecurityRulesDisabled(async (context) => {
            await context.firestore().doc(`projects/${id}`).set({
                owner: Users.Owner,
                collaborators: [],
                commenters: [],
                viewers: [],
                gallery: null,
            });
        });
        await assertSucceeds(
            projectDoc(Users.Owner, id).update({ timestamp: 1 }),
        );
    });

    it('a project predating research consent can still be updated by a collaborator', async () => {
        const id = `rulestest-no-consent-${runID}`;
        await env.withSecurityRulesDisabled(async (context) => {
            await context
                .firestore()
                .doc(`projects/${id}`)
                .set({
                    owner: Users.Owner,
                    collaborators: [Users.Collaborator],
                    commenters: [],
                    viewers: [],
                    public: false,
                    gallery: null,
                });
        });
        await assertSucceeds(
            projectDoc(Users.Collaborator, id).update({ timestamp: 1 }),
        );
    });
});

describe('ownership can only be handed over by the owner', () => {
    // #189. A transfer is an ordinary project update performed by the current
    // owner, so the rules have to tell it apart from a collaborator writing
    // themselves in as owner — which they could do freely before, since the
    // update rule admits collaborators and never looked at which fields changed.
    it('the owner can hand the project to a collaborator', async () => {
        await assertSucceeds(
            projectDoc(Users.Owner, Projects.Public).update({
                owner: Users.Collaborator,
                collaborators: [Users.Owner],
            }),
        );
        // Put it back, so the fixture is what the other tests expect.
        await env.withSecurityRulesDisabled(async (context) => {
            await context
                .firestore()
                .doc(`projects/${Projects.Public}`)
                .update({
                    owner: Users.Owner,
                    collaborators: [Users.Collaborator],
                });
        });
    });

    it('a collaborator cannot make themselves the owner', async () => {
        await assertFails(
            projectDoc(Users.Collaborator, Projects.Unrestricted).update({
                owner: Users.Collaborator,
            }),
        );
    });

    it('a gallery curator cannot take a project in their gallery', async () => {
        await assertFails(
            projectDoc(Users.Curator, Projects.Unrestricted).update({
                owner: Users.Curator,
            }),
        );
    });

    it('a collaborator can still make every other edit', async () => {
        await assertSucceeds(
            projectDoc(Users.Collaborator, Projects.Unrestricted).update({
                timestamp: 2,
            }),
        );
    });
});

describe('updates writes stay owner/collaborator-only', () => {
    // Unique per run: updates are immutable (`allow update: if false`), so a
    // fixed ID left behind in a long-lived emulator would turn this create
    // into a correctly-denied update on the next run.
    const runId = Date.now().toString(36);
    it('owner and collaborator can append updates', async () => {
        await assertSucceeds(
            subDoc(
                Users.Owner,
                Projects.Unrestricted,
                'updates',
                `u-owner-${runId}`,
            ).set({ writer: 'w2', update: 'BBBB' }),
        );
        await assertSucceeds(
            subDoc(
                Users.Collaborator,
                Projects.Unrestricted,
                'updates',
                `u-collab-${runId}`,
            ).set({ writer: 'w3', update: 'CCCC' }),
        );
    });
    it('curator, commenter, and viewer cannot append updates', async () => {
        for (const uid of [Users.Curator, Users.Commenter, Users.Viewer])
            await assertFails(
                subDoc(uid, Projects.Unrestricted, 'updates', `u-${uid}`).set({
                    writer: 'w4',
                    update: 'DDDD',
                }),
            );
    });
});

describe('presence writes: editors only, and only as themselves', () => {
    it('curator can write their own presence doc in a curated gallery project', async () => {
        await assertSucceeds(
            subDoc(
                Users.Curator,
                Projects.Unrestricted,
                'presence',
                'curator-client',
            ).set({ userID: Users.Curator, lastSeen: 1 }),
        );
        await assertSucceeds(
            subDoc(
                Users.Curator,
                Projects.Restricted,
                'presence',
                'curator-client',
            ).set({ userID: Users.Curator, lastSeen: 1 }),
        );
    });
    it('curator cannot write presence claiming another userID', async () => {
        await assertFails(
            subDoc(
                Users.Curator,
                Projects.Unrestricted,
                'presence',
                'curator-client2',
            ).set({ userID: Users.Owner, lastSeen: 1 }),
        );
    });
    it('curator cannot write presence in a gallery they do not curate', async () => {
        await assertFails(
            subDoc(
                Users.Curator,
                Projects.OtherGallery,
                'presence',
                'curator-client',
            ).set({ userID: Users.Curator, lastSeen: 1 }),
        );
    });
    it('owner and collaborator can write their own presence (regression)', async () => {
        for (const uid of [Users.Owner, Users.Collaborator])
            await assertSucceeds(
                subDoc(
                    uid,
                    Projects.Unrestricted,
                    'presence',
                    `${uid}-client`,
                ).set({ userID: uid, lastSeen: 2 }),
            );
    });
    it('commenter, viewer, classmate, and stranger cannot write presence', async () => {
        for (const uid of [
            Users.Commenter,
            Users.Viewer,
            Users.Classmate,
            Users.Stranger,
        ])
            await assertFails(
                subDoc(
                    uid,
                    Projects.Unrestricted,
                    'presence',
                    `${uid}-client`,
                ).set({ userID: uid, lastSeen: 2 }),
            );
    });
    it('signed-out cannot write presence even on a public project', async () => {
        await assertFails(
            subDoc(null, Projects.Public, 'presence', 'anon-client').set({
                userID: 'anon',
                lastSeen: 3,
            }),
        );
    });
    it('a user can delete their own presence doc; owner can delete any (regression)', async () => {
        await assertSucceeds(
            subDoc(
                Users.Collaborator,
                Projects.Unrestricted,
                'presence',
                `${Users.Collaborator}-client`,
            ).delete(),
        );
        await assertSucceeds(
            subDoc(
                Users.Owner,
                Projects.Unrestricted,
                'presence',
                'curator-client',
            ).delete(),
        );
    });
});
