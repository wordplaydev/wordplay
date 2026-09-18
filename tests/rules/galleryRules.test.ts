import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Security-rules tests for gallery vanity paths (#180).
 *
 * Two claims are under test, and both are the kind that fail silently if they
 * rot: that no client can write the name or its index, and that the query a
 * visitor resolves a vanity link with is one the rules actually allow.
 */

const Users = {
    Curator: 'gallerypath-curator',
    Creator: 'gallerypath-creator',
    Stranger: 'gallerypath-stranger',
    Mod: 'gallerypath-mod',
};

const Galleries = {
    Public: 'gallerypath-public',
    Private: 'gallerypath-private',
};

let env: RulesTestEnvironment;

function as(uid: string, claims?: Record<string, unknown>) {
    return env.authenticatedContext(uid, claims).firestore();
}

function anon() {
    return env.unauthenticatedContext().firestore();
}

function gallery(overrides: Record<string, unknown> = {}) {
    return {
        v: 5,
        id: Galleries.Public,
        path: null,
        pathAliases: [],
        name: { 'en-US': 'Ms Kim' },
        description: { 'en-US': '' },
        words: [],
        projects: [],
        characters: [],
        curators: [Users.Curator],
        creators: [Users.Creator],
        public: true,
        moderation: 'approved',
        moderatedAt: 0,
        flags: {
            dehumanization: null,
            violence: null,
            disclosure: null,
            misinformation: null,
        },
        howTos: [],
        howToExpandedVisibility: false,
        howToExpandedGalleries: [],
        howToViewers: {},
        howToViewersFlat: [],
        howToGuidingQuestions: [],
        howToReactions: {},
        ...overrides,
    };
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

beforeEach(async () => {
    // Seeded with rules disabled, the way the callable's Admin SDK writes them.
    await env.withSecurityRulesDisabled(async (context) => {
        const store = context.firestore();
        await store.doc(`galleries/${Galleries.Public}`).set(
            gallery({
                path: 'kim-p4',
                pathAliases: ['kim-period-4'],
            }),
        );
        await store.doc(`galleries/${Galleries.Private}`).set(
            gallery({
                id: Galleries.Private,
                public: false,
                moderation: 'unrequested',
                path: 'kim-secret',
            }),
        );
        await store.doc('gallerypaths/kim-p4').set({
            v: 1,
            gallery: Galleries.Public,
            path: 'kim-p4',
            claimed: 0,
        });
    });
});

describe('the reservation index', () => {
    // Unreadable, not merely unwritable: a readable name-keyed index is a bulk
    // enumeration of every gallery on the platform, private ones included.
    it('cannot be read by anyone at all', async () => {
        for (const store of [
            anon(),
            as(Users.Stranger),
            as(Users.Curator),
            as(Users.Mod, { mod: true }),
        ])
            await assertFails(store.doc('gallerypaths/kim-p4').get());
    });

    it('cannot be written by anyone at all', async () => {
        // Claiming has to go through the callable, which takes the reservation
        // in the same transaction as the gallery's own path. A direct write
        // would skip uniqueness entirely.
        for (const store of [
            as(Users.Stranger),
            as(Users.Curator),
            as(Users.Mod, { mod: true }),
        ])
            await assertFails(
                store.doc('gallerypaths/kim-taken').set({
                    v: 1,
                    gallery: Galleries.Public,
                    path: 'kim-taken',
                }),
            );
    });

    it('cannot be deleted by anyone at all, curator included', async () => {
        // Giving a name up releases it back into the pool (#180), so a curator
        // has a real reason to want this document gone — and must still go
        // through releaseGalleryPath, which deletes it in the same transaction
        // that takes the name off the gallery. A direct delete would free the
        // name while the gallery kept answering to it.
        for (const store of [
            as(Users.Stranger),
            as(Users.Curator),
            as(Users.Mod, { mod: true }),
        ])
            await assertFails(store.doc('gallerypaths/kim-p4').delete());
    });
});

describe('path and pathAliases are the server’s', () => {
    it('a curator cannot give their own gallery a name', async () => {
        await assertFails(
            as(Users.Curator)
                .doc(`galleries/${Galleries.Public}`)
                .update({ path: 'something-else' }),
        );
    });

    it('a curator cannot rewrite the aliases that redirect to it', async () => {
        // One that could would take back a name it had superseded, or claim a
        // redirect for a name another gallery holds.
        await assertFails(
            as(Users.Curator)
                .doc(`galleries/${Galleries.Public}`)
                .update({ pathAliases: ['someone-elses-name'] }),
        );
    });

    it('a curator can still change everything that is theirs', async () => {
        await assertSucceeds(
            as(Users.Curator)
                .doc(`galleries/${Galleries.Public}`)
                .update({ name: { 'en-US': 'Ms Kim, period 4' } }),
        );
    });

    it('a new gallery cannot arrive already holding a name', async () => {
        // The create guard, which #1352 is the reason for: every rule the
        // update guard states could otherwise be walked around by putting the
        // value in the new document instead.
        const created = 'galleries/gallerypath-created';
        await env.withSecurityRulesDisabled(async (context) => {
            await context.firestore().doc(created).delete();
        });
        await assertFails(
            as(Users.Curator)
                .doc(created)
                .set(
                    gallery({
                        id: 'gallerypath-created',
                        public: false,
                        moderation: 'unrequested',
                        moderatedAt: null,
                        path: 'mine',
                    }),
                ),
        );
        await assertFails(
            as(Users.Curator)
                .doc(created)
                .set(
                    gallery({
                        id: 'gallerypath-created',
                        public: false,
                        moderation: 'unrequested',
                        moderatedAt: null,
                        pathAliases: ['mine'],
                    }),
                ),
        );
    });
});

describe('resolving a vanity link', () => {
    it('a signed-out visitor can look a public gallery up by path', async () => {
        await assertSucceeds(
            anon()
                .collection('galleries')
                .where('path', '==', 'kim-p4')
                .where('public', '==', true)
                .limit(1)
                .get(),
        );
    });

    it('and by an older name it still answers to', async () => {
        await assertSucceeds(
            anon()
                .collection('galleries')
                .where('pathAliases', 'array-contains', 'kim-period-4')
                .where('public', '==', true)
                .limit(1)
                .get(),
        );
    });

    it('but not without the public clause, even as a curator', async () => {
        // This is the assertion that stops someone "simplifying" the query.
        // Firestore evaluates a query against its potential result set, so the
        // query's own constraints must imply the read rule — and the gallery
        // read rule grants on `public`. Without the clause this is denied for
        // everyone, which is why a curator's own private gallery is resolved
        // from the local cache instead.
        for (const store of [anon(), as(Users.Curator)])
            await assertFails(
                store
                    .collection('galleries')
                    .where('path', '==', 'kim-p4')
                    .limit(1)
                    .get(),
            );
    });

    it('and a private gallery does not come back from a path query', async () => {
        // The reservation still holds the name, so nobody else can take it, but
        // it stops resolving — which is what "stays reserved, stops resolving"
        // means in practice.
        const results = await anon()
            .collection('galleries')
            .where('path', '==', 'kim-secret')
            .where('public', '==', true)
            .limit(1)
            .get();
        if (!results.empty)
            throw new Error('a private gallery resolved by its path');
    });
});
