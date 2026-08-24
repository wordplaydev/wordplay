/**
 * Security-rules tests for the `usage` collection, run against the Firestore
 * emulator via `npm run test:rules`.
 *
 * The invariant under test: a creator can watch their own translation budget but
 * can never write it. The budget is only a defence against Denial-of-Wallet
 * (#1073) if the counter is server-authoritative — a creator who could write
 * this document could reset their own daily budget and the cap would mean
 * nothing.
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
    Creator: 'usagetest-creator',
    Other: 'usagetest-other',
};

let env: RulesTestEnvironment;

function usageDoc(uid: string | null, owner: string) {
    const db =
        uid === null
            ? env.unauthenticatedContext().firestore()
            : env.authenticatedContext(uid).firestore();
    return db.doc(`usage/${owner}`);
}

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-wordplay',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
    // Seeded with rules disabled, the way the Admin SDK writes it in production.
    await env.withSecurityRulesDisabled(async (context) => {
        for (const uid of Object.values(Users))
            await context
                .firestore()
                .doc(`usage/${uid}`)
                .set({
                    translation: {
                        day: '2026-08-20',
                        characters: 1400,
                        limit: 10000,
                    },
                });
    });
});

afterAll(async () => {
    await env.cleanup();
});

describe('usage', () => {
    it('a creator can read their own usage', async () => {
        await assertSucceeds(usageDoc(Users.Creator, Users.Creator).get());
    });

    it("a creator cannot read someone else's usage", async () => {
        await assertFails(usageDoc(Users.Creator, Users.Other).get());
    });

    it('an unauthenticated client cannot read usage', async () => {
        await assertFails(usageDoc(null, Users.Creator).get());
    });

    it('a creator cannot update their own usage', async () => {
        await assertFails(
            usageDoc(Users.Creator, Users.Creator).update({
                'translation.characters': 0,
            }),
        );
    });

    it('a creator cannot overwrite their own usage', async () => {
        await assertFails(
            usageDoc(Users.Creator, Users.Creator).set({
                translation: { day: '2026-08-20', characters: 0 },
            }),
        );
    });

    it('a creator cannot delete their own usage', async () => {
        await assertFails(usageDoc(Users.Creator, Users.Creator).delete());
    });

    it('a creator cannot create a usage document for themselves', async () => {
        await assertFails(
            usageDoc(Users.Creator, 'usagetest-fresh').set({
                translation: { day: '2026-08-20', characters: 0 },
            }),
        );
    });
});
