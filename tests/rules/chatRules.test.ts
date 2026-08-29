import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Security-rules tests for chats — the first they have ever had.
 *
 * A chat document is a conversation several people share, so who may destroy it
 * is not the same question as who may take part in it. Deleting a project is
 * the only path that deletes a chat, and only a project's owner may delete it,
 * so that is what the delete rule reads.
 */

const Users = {
    Owner: 'rulestest-chat-owner',
    Collaborator: 'rulestest-chat-collaborator',
    Stranger: 'rulestest-chat-stranger',
    Mod: 'rulestest-chat-mod',
};

/** A chat's document id is its project's id, which is what the rule relies on. */
const Chat = 'rulestest-chat-project';
/** A chat whose project doesn't exist, standing in for a how-to's chat. */
const Orphan = 'rulestest-chat-orphan';

let env: RulesTestEnvironment;

function as(uid: string, claims?: Record<string, unknown>) {
    return env.authenticatedContext(uid, claims).firestore();
}

const participants = [Users.Owner, Users.Collaborator];

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-wordplay',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
});

beforeEach(async () => {
    // Rebuilt per test: several of these write, and a delete would otherwise
    // leave the next test with nothing to act on.
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc(`projects/${Chat}`).set({
            owner: Users.Owner,
            collaborators: [Users.Collaborator],
            commenters: [],
            viewers: [],
            public: false,
            gallery: null,
            researchConsent: false,
        });
        for (const id of [Chat, Orphan])
            await db.doc(`chats/${id}`).set({
                v: 3,
                project: id,
                type: 'project',
                participants,
                messages: [
                    { id: 'm1', time: 1, creator: Users.Owner, text: 'hi' },
                ],
                moderation: {},
                unread: [],
            });
    });
});

afterAll(async () => {
    await env.cleanup();
});

describe('chats: participants take part, the project owner disposes', () => {
    it('a participant can read the conversation', async () => {
        await assertSucceeds(as(Users.Collaborator).doc(`chats/${Chat}`).get());
    });

    it('someone who is not a participant cannot', async () => {
        await assertFails(as(Users.Stranger).doc(`chats/${Chat}`).get());
    });

    it('a moderator gets no special access — a chat is not public content', async () => {
        await assertFails(
            as(Users.Mod, { mod: true }).doc(`chats/${Chat}`).get(),
        );
    });

    it('a participant can add a message', async () => {
        await assertSucceeds(
            as(Users.Collaborator)
                .doc(`chats/${Chat}`)
                .update({
                    messages: [
                        { id: 'm1', time: 1, creator: Users.Owner, text: 'hi' },
                        {
                            id: 'm2',
                            time: 2,
                            creator: Users.Collaborator,
                            text: 'hello',
                        },
                    ],
                }),
        );
    });

    it('a participant can keep the participant list in step with the project', async () => {
        // syncParticipants mirrors the project's permissions from whichever
        // client notices the change, so this stays client-written for now.
        await assertSucceeds(
            as(Users.Collaborator)
                .doc(`chats/${Chat}`)
                .update({ participants: [...participants, Users.Stranger] }),
        );
    });

    it('a participant cannot decide about a message', async () => {
        // The reason `moderation` is a top-level map and not a field on each
        // message: before #938 a reported author could set their own message
        // back to `approved`, and no rule could reach inside the array to stop
        // them.
        await assertFails(
            as(Users.Collaborator)
                .doc(`chats/${Chat}`)
                .update({ moderation: { m1: 'approved' } }),
        );
    });

    it('nor slip a decision in alongside a legitimate message', async () => {
        await assertFails(
            as(Users.Collaborator)
                .doc(`chats/${Chat}`)
                .update({
                    messages: [
                        { id: 'm1', time: 1, creator: Users.Owner, text: 'hi' },
                        {
                            id: 'm2',
                            time: 2,
                            creator: Users.Collaborator,
                            text: 'hello',
                        },
                    ],
                    moderation: { m1: 'approved' },
                }),
        );
    });

    it('nor drop messages to erase the record', async () => {
        await assertFails(
            as(Users.Collaborator)
                .doc(`chats/${Chat}`)
                .update({ messages: [] }),
        );
    });

    it.skip('a participant cannot rewrite someone else’s message text', async () => {
        // Not closed, and not closable by a rule of this shape: an append-only
        // guard over `messages` would make soft-deleting your own message
        // inexpressible, and hasAll over an array that may approach 128KB
        // risks the rules expression limits. Messages as a subcollection is
        // the fix; skipped rather than deleted so the gap stays visible.
        await assertFails(
            as(Users.Collaborator)
                .doc(`chats/${Chat}`)
                .update({
                    messages: [
                        {
                            id: 'm1',
                            time: 1,
                            creator: Users.Owner,
                            text: 'words the owner never wrote',
                        },
                    ],
                }),
        );
    });

    it('the project owner can delete the chat, which is how deleting a project works', async () => {
        await assertSucceeds(as(Users.Owner).doc(`chats/${Chat}`).delete());
    });

    it('a collaborator cannot delete the conversation for everyone', async () => {
        await assertFails(as(Users.Collaborator).doc(`chats/${Chat}`).delete());
    });

    it('nor can a stranger, or a moderator', async () => {
        await assertFails(as(Users.Stranger).doc(`chats/${Chat}`).delete());
        await assertFails(
            as(Users.Mod, { mod: true }).doc(`chats/${Chat}`).delete(),
        );
    });

    it('a chat whose project is gone cannot be deleted by anyone', async () => {
        // get() answers null for a missing document, so the rule denies rather
        // than erroring. This is also today's behavior for a how-to's chat,
        // whose id names a how-to and never a project.
        await assertFails(as(Users.Owner).doc(`chats/${Orphan}`).delete());
        await assertFails(
            as(Users.Collaborator).doc(`chats/${Orphan}`).delete(),
        );
    });
});
