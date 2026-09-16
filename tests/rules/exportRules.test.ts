/**
 * Security-rules tests for the queries an account export depends on (#152),
 * run against the Firestore emulator via `npm run test:rules`.
 *
 * The export is client-side precisely because a creator may already read
 * everything in their own account. That is a claim about the rules, so it is
 * tested against the rules — and two of these query shapes are new, which means
 * nothing else in the suite would notice if they were denied:
 *
 * - `kitversions where owner ==` replaces a per-kit walk of every version
 *   number. Its `owner` field is denormalized onto the version exactly so a
 *   field test can answer it with no `get()`.
 * - `feedback where creator ==` gathers the ideas and bugs a creator has sent.
 * - `classes` unfiltered by gallery: the app only ever asks for a teacher's
 *   classes within one gallery, but an archive wants all of them.
 *
 * Each is checked in both directions. A query that only succeeds for its owner
 * proves the rule is doing its job; one that also succeeds for a stranger would
 * mean the export had found a way to read other people's work.
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
    Creator: 'exporttest-creator',
    Other: 'exporttest-other',
};

let env: RulesTestEnvironment;

function as(uid: string) {
    return env.authenticatedContext(uid).firestore();
}

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-wordplay',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
    // Seeded with rules disabled, the way the Admin SDK writes these in
    // production: a version's `owner` and a class's roster are both
    // server-written.
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('kits/exporttest-kit').set({
            v: 1,
            name: 'colors',
            owner: Users.Creator,
            public: false,
        });
        await db.doc('kitversions/exporttest-kit_1').set({
            v: 1,
            kit: 'exporttest-kit',
            version: 1,
            owner: Users.Creator,
            public: false,
            code: '↑ red: 1',
        });
        await db.doc('feedback/exporttest-feedback').set({
            v: 2,
            creator: Users.Creator,
            title: 'a thought',
            status: 'open',
        });
        await db.doc('classes/exporttest-class').set({
            name: 'a class',
            teachers: [Users.Creator],
            learners: [],
            info: [],
        });
    });
});

afterAll(async () => {
    await env.cleanup();
});

describe('the queries an account export makes', () => {
    it('lets a creator read every version of their own kits at once', async () => {
        await assertSucceeds(
            as(Users.Creator)
                .collection('kitversions')
                .where('owner', '==', Users.Creator)
                .get(),
        );
    });

    it("refuses someone else's unpublished kit versions", async () => {
        // The archive must not become a way to read work nobody has published.
        await assertFails(
            as(Users.Other)
                .collection('kitversions')
                .where('owner', '==', Users.Creator)
                .get(),
        );
    });

    it('lets a creator read the feedback they sent', async () => {
        await assertSucceeds(
            as(Users.Creator)
                .collection('feedback')
                .where('creator', '==', Users.Creator)
                .get(),
        );
    });

    it('lets a teacher read every class they teach, not just one gallery worth', async () => {
        await assertSucceeds(
            as(Users.Creator)
                .collection('classes')
                .where('teachers', 'array-contains', Users.Creator)
                .get(),
        );
    });

    it('refuses a class someone is not in', async () => {
        await assertFails(
            as(Users.Other)
                .collection('classes')
                .where('teachers', 'array-contains', Users.Creator)
                .get(),
        );
    });

    it('lets a creator read the documents keyed by their own uid', async () => {
        // The export reads all five in one go; each is `allow read: self`.
        for (const name of [
            'creators',
            'handles',
            'usage',
            'strikes',
            'notices',
        ])
            await assertSucceeds(
                as(Users.Creator).doc(`${name}/${Users.Creator}`).get(),
            );
    });

    it("refuses another creator's own documents", async () => {
        for (const name of ['creators', 'handles', 'usage', 'notices'])
            await assertFails(
                as(Users.Other).doc(`${name}/${Users.Creator}`).get(),
            );
    });
});
