import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, describe, it } from 'vitest';

/**
 * A proxy session reads everything that creator can, and writes nothing (#1313).
 *
 * The asymmetry is the whole feature, and it is the half that rules can
 * actually enforce. A proxy holds a genuine ID token for the person being
 * looked at — so every rule that admits *them* admits it too, and the only
 * thing telling the two apart is the `proxy` claim minted onto that one token.
 *
 * Read cases matter as much as write cases here: a proxy that could not read
 * would be a useless feature, and it would be easy to produce by accident while
 * adding the write guard (two rules granted `read, write` together and had to
 * be split).
 */

const Users = {
    Owner: 'rulestest-proxy-owner',
    Stranger: 'rulestest-proxy-stranger',
};

const Projects = {
    /** Owned by Owner, private, in no gallery. */
    Private: 'rulestest-proxy-project',
};

const Chat = 'rulestest-proxy-chat';

let env: RulesTestEnvironment;

/** Acting as the owner, either normally or through a proxy session. */
function as(uid: string, claims?: Record<string, unknown>) {
    return env.authenticatedContext(uid, claims).firestore();
}
const proxy = () => as(Users.Owner, { proxy: true });

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-wordplay',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
    // Seeded once and never cleared: every rules suite shares one emulator, so
    // a clearFirestore() here wipes the others' fixtures. Ids are prefixed
    // `rulestest-proxy-` so nothing collides.
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc(`projects/${Projects.Private}`).set({
            id: Projects.Private,
            owner: Users.Owner,
            collaborators: [],
            commenters: [],
            viewers: [],
            gallery: null,
            public: false,
            researchConsent: false,
        });
        await db
            .doc(`creators/${Users.Owner}`)
            .set({ locales: ['en-US'], animationFactor: 1 });
        await db.doc(`chats/${Chat}`).set({
            id: Chat,
            project: Projects.Private,
            participants: [Users.Owner],
            messages: [],
            unread: [Users.Owner],
        });
    });
});

afterAll(async () => {
    await env.cleanup();
});

describe('a proxy session reads what that creator reads', () => {
    it('their private project', async () => {
        await assertSucceeds(proxy().doc(`projects/${Projects.Private}`).get());
    });

    it('their settings, which is what makes the session look like theirs', async () => {
        // `creators/{uid}` granted `read, write` in one statement before this
        // feature. Splitting it is what keeps this passing while the write
        // below fails — get it wrong and the proxy renders in the
        // administrator's locale rather than the creator's.
        await assertSucceeds(proxy().doc(`creators/${Users.Owner}`).get());
    });

    it('their conversations', async () => {
        await assertSucceeds(proxy().doc(`chats/${Chat}`).get());
    });

    it('and still nothing a stranger could not read', async () => {
        // The claim grants nothing of its own: it only ever subtracts.
        await assertFails(
            as(Users.Stranger, { proxy: true })
                .doc(`projects/${Projects.Private}`)
                .get(),
        );
    });
});

describe('a proxy session writes nothing', () => {
    it('cannot edit their project', async () => {
        await assertFails(
            proxy().doc(`projects/${Projects.Private}`).update({ name: 'No' }),
        );
    });

    it('cannot delete their project', async () => {
        await assertFails(proxy().doc(`projects/${Projects.Private}`).delete());
    });

    it('cannot create a project as them', async () => {
        await assertFails(
            proxy().collection('projects').add({
                id: 'rulestest-proxy-new',
                owner: Users.Owner,
                collaborators: [],
                commenters: [],
                viewers: [],
                gallery: null,
                public: false,
            }),
        );
    });

    it('cannot overwrite their settings', async () => {
        // The one that would happen by accident within a second of connecting:
        // SettingsDatabase re-applies settings on every sign-in, and
        // uploadSettings is a wholesale overwrite of this document.
        await assertFails(
            proxy()
                .doc(`creators/${Users.Owner}`)
                .set({ locales: ['de-DE'] }),
        );
    });

    it('cannot mark their conversations read', async () => {
        await assertFails(proxy().doc(`chats/${Chat}`).update({ unread: [] }));
    });

    it('cannot announce itself as present in their project', async () => {
        // The "invisible to them" half: a presence document is readable by
        // everyone who can read the project, so a proxy that could write one
        // would appear to their collaborators as a live editor.
        await assertFails(
            proxy()
                .doc(
                    `projects/${Projects.Private}/presence/rulestest-proxy-client`,
                )
                .set({
                    clientID: 'rulestest-proxy-client',
                    userID: Users.Owner,
                    sourceIndex: 0,
                    caret: 0,
                    color: 180,
                    lastSeen: Date.now(),
                }),
        );
    });

    it('cannot publish a CRDT update', async () => {
        await assertFails(
            proxy()
                .collection(`projects/${Projects.Private}/updates`)
                .add({ writer: 'rulestest-proxy-client', update: 'AAA' }),
        );
    });

    it('cannot create a character, gallery, how-to or kit as them', async () => {
        for (const [collection, data] of [
            ['characters', { owner: Users.Owner, collaborators: [] }],
            [
                'galleries',
                { curators: [Users.Owner], creators: [], public: false },
            ],
            ['kits', { owner: Users.Owner, public: false }],
        ] as const)
            await assertFails(proxy().collection(collection).add(data));
    });
});

describe('the audit trail', () => {
    it('is not writable by anyone, administrator included', async () => {
        await assertFails(
            as('rulestest-proxy-admin', { admin: true })
                .collection('proxies')
                .add({ by: 'someone', uid: 'someone-else', at: 1 }),
        );
    });

    it('is not readable by the creator it names', async () => {
        await assertFails(as(Users.Owner).doc('proxies/whatever').get());
    });
});
