/**
 * Security-rules tests for the three collections behind email-only logins
 * (#628), run against the Firestore emulator via `npm run test:rules`.
 *
 * The invariants under test:
 *
 * - `handles/{uid}` is a creator's username. Readable by its owner so the
 *   profile can render it without a round trip, never client-writable — a
 *   creator who could write it could take a name that other people's
 *   `@username/Character` references already point at.
 * - `usernames/{folded}` is the uniqueness index, and is readable by nobody.
 *   A readable name-keyed index is a bulk enumeration of every account.
 * - `signinThrottle/{key}` bounds how often our mail sender can be aimed at an
 *   address, and is likewise readable by nobody: being able to read it would
 *   answer "does this address have an account", which the login page refuses to
 *   answer by always giving the same reply.
 */
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, describe, it } from 'vitest';

const Users = {
    Creator: 'handletest-creator',
    Other: 'handletest-other',
    Mod: 'handletest-mod',
};

let env: RulesTestEnvironment;

function db(uid: string | null, mod = false) {
    return uid === null
        ? env.unauthenticatedContext().firestore()
        : env
              .authenticatedContext(uid, mod ? { mod: true } : undefined)
              .firestore();
}

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-wordplay',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
    // Seeded with rules disabled, the way the Admin SDK writes these.
    await env.withSecurityRulesDisabled(async (context) => {
        const store = context.firestore();
        for (const uid of Object.values(Users))
            await store.doc(`handles/${uid}`).set({
                v: 1,
                username: uid,
                folded: uid,
                claimed: 0,
            });
        await store
            .doc('usernames/handletest-creator')
            .set({ v: 1, uid: Users.Creator, username: Users.Creator });
        await store.doc('signinThrottle/e:abc123').set({ v: 1, sent: [0] });
    });
});

afterAll(async () => {
    await env.cleanup();
});

describe('handles', () => {
    it('a creator can read their own handle', async () => {
        await assertSucceeds(
            db(Users.Creator).doc(`handles/${Users.Creator}`).get(),
        );
    });

    it("a creator cannot read someone else's handle", async () => {
        // Another creator's username is public information, but it arrives
        // through getCreators — which reads it with the Admin SDK and returns a
        // username without an email. Direct reads would make this collection a
        // uid-to-account oracle for anyone who can guess a uid.
        await assertFails(
            db(Users.Creator).doc(`handles/${Users.Other}`).get(),
        );
    });

    it('an unauthenticated client cannot read a handle', async () => {
        await assertFails(db(null).doc(`handles/${Users.Creator}`).get());
    });

    it('a moderator cannot read a handle directly either', async () => {
        // Unlike strikes/{uid}, there is no moderator carve-out: a moderator
        // sees usernames the same way everyone else does.
        await assertFails(
            db(Users.Mod, true).doc(`handles/${Users.Other}`).get(),
        );
    });

    it('a creator cannot rename themselves', async () => {
        await assertFails(
            db(Users.Creator)
                .doc(`handles/${Users.Creator}`)
                .update({ username: 'someoneelse' }),
        );
    });

    it('a creator cannot overwrite their own handle', async () => {
        await assertFails(
            db(Users.Creator).doc(`handles/${Users.Creator}`).set({
                v: 1,
                username: 'someoneelse',
                folded: 'someoneelse',
                claimed: 0,
            }),
        );
    });

    it('a creator cannot claim a handle for themselves', async () => {
        // Claiming has to go through the callable, which takes the reservation
        // in the same transaction. A direct write would skip uniqueness.
        await assertFails(
            db('handletest-fresh').doc('handles/handletest-fresh').set({
                v: 1,
                username: 'brandnew',
                folded: 'brandnew',
                claimed: 0,
            }),
        );
    });

    it('a creator cannot delete their own handle', async () => {
        await assertFails(
            db(Users.Creator).doc(`handles/${Users.Creator}`).delete(),
        );
    });
});

describe('usernames', () => {
    it('nobody can read a reservation, not even its holder', async () => {
        await assertFails(
            db(Users.Creator).doc(`usernames/${Users.Creator}`).get(),
        );
    });

    it('an unauthenticated client cannot read a reservation', async () => {
        await assertFails(db(null).doc(`usernames/${Users.Creator}`).get());
    });

    it('a moderator cannot read a reservation', async () => {
        await assertFails(
            db(Users.Mod, true).doc(`usernames/${Users.Creator}`).get(),
        );
    });

    it('nobody can list reservations', async () => {
        // The enumeration this collection exists to prevent.
        await assertFails(db(Users.Creator).collection('usernames').get());
    });

    it('a creator cannot reserve a name directly', async () => {
        await assertFails(
            db(Users.Creator)
                .doc('usernames/brandnew')
                .set({ v: 1, uid: Users.Creator, username: 'brandnew' }),
        );
    });

    it('a creator cannot take over an existing reservation', async () => {
        await assertFails(
            db(Users.Other)
                .doc(`usernames/${Users.Creator}`)
                .update({ uid: Users.Other }),
        );
    });

    it('a creator cannot release a reservation', async () => {
        await assertFails(
            db(Users.Creator).doc(`usernames/${Users.Creator}`).delete(),
        );
    });
});

describe('signinThrottle', () => {
    it('nobody can read a throttle record', async () => {
        await assertFails(
            db(Users.Creator).doc('signinThrottle/e:abc123').get(),
        );
    });

    it('an unauthenticated client cannot read a throttle record', async () => {
        await assertFails(db(null).doc('signinThrottle/e:abc123').get());
    });

    it('nobody can list throttle records', async () => {
        await assertFails(db(Users.Creator).collection('signinThrottle').get());
    });

    it('a creator cannot clear their own throttle', async () => {
        // The whole point: someone who could reset this could send themselves
        // unlimited links, and aim them at anyone.
        await assertFails(
            db(Users.Creator)
                .doc('signinThrottle/e:abc123')
                .set({ v: 1, sent: [] }),
        );
    });
});
