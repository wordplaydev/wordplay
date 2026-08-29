import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Security-rules tests for a creator's inbox (#938).
 *
 * The claim under test is that a notice is delivered, not claimed: the reader
 * may say they've seen it and may put it away, but may not write one. A creator
 * who could append to their own inbox could forge a moderator's decision to
 * themselves, and one who could overwrite it could delete the warning they were
 * just given.
 */

const Users = {
    Reader: 'rulestest-notices-reader',
    Other: 'rulestest-notices-other',
    Mod: 'rulestest-notices-mod',
};

let env: RulesTestEnvironment;

function as(uid: string, claims?: Record<string, unknown>) {
    return env.authenticatedContext(uid, claims).firestore();
}

const notice = {
    id: 'n1',
    kind: 'decision',
    subject: { kind: 'project', id: 'p1', gallery: null },
    title: 'A project',
    time: 1,
};

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-wordplay',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
});

beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (context) => {
        // Seeded past the rules, because only the Admin SDK may write notices.
        await context
            .firestore()
            .doc(`notices/${Users.Reader}`)
            .set({ v: 1, notices: [notice], dismissed: [], readAt: 0 });
    });
});

afterAll(async () => {
    await env.cleanup();
});

describe('notices: delivered, not claimed', () => {
    it('the reader can read their own inbox', async () => {
        await assertSucceeds(
            as(Users.Reader).doc(`notices/${Users.Reader}`).get(),
        );
    });

    it('nobody else can, moderators included — an inbox is not moderation data', async () => {
        await assertFails(as(Users.Other).doc(`notices/${Users.Reader}`).get());
        await assertFails(
            as(Users.Mod, { mod: true }).doc(`notices/${Users.Reader}`).get(),
        );
    });

    it('the reader can mark it read and dismiss things', async () => {
        await assertSucceeds(
            as(Users.Reader)
                .doc(`notices/${Users.Reader}`)
                .update({ readAt: 5, dismissed: ['n1'] }),
        );
    });

    it('but cannot append a notice to their own inbox', async () => {
        // Forging a decision to yourself, which is the whole reason this is
        // server-written.
        await assertFails(
            as(Users.Reader)
                .doc(`notices/${Users.Reader}`)
                .update({ notices: [notice, { ...notice, id: 'n2' }] }),
        );
    });

    it('nor delete the warning they were just given', async () => {
        await assertFails(
            as(Users.Reader)
                .doc(`notices/${Users.Reader}`)
                .update({ notices: [] }),
        );
    });

    it('nor slip a notices change in alongside a legitimate dismissal', async () => {
        // The guard is on the set of changed keys, not on any one of them.
        await assertFails(
            as(Users.Reader)
                .doc(`notices/${Users.Reader}`)
                .update({ dismissed: ['n1'], notices: [] }),
        );
    });

    it('nor delete the inbox to clear it', async () => {
        await assertFails(
            as(Users.Reader).doc(`notices/${Users.Reader}`).delete(),
        );
    });

    it('a creator with no inbox can start an empty one, so a dismissal has somewhere to land', async () => {
        // A derived notice can be dismissed before the server has ever written
        // anything, and that dismissal has to persist across devices.
        await assertSucceeds(
            as(Users.Other)
                .doc(`notices/${Users.Other}`)
                .set({ v: 1, notices: [], dismissed: ['g1'], readAt: 0 }),
        );
    });

    it('but not one that arrives with notices already in it', async () => {
        await assertFails(
            as(Users.Mod)
                .doc(`notices/${Users.Mod}`)
                .set({ v: 1, notices: [notice], dismissed: [], readAt: 0 }),
        );
    });

    it('and cannot write into someone else’s', async () => {
        await assertFails(
            as(Users.Other)
                .doc(`notices/${Users.Reader}`)
                .update({ dismissed: ['n1'] }),
        );
    });
});
