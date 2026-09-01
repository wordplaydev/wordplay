import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    SerializedChat,
    SerializedChatUnknownVersion,
    SerializedMessage,
} from './ChatDatabase.svelte';

type Op = {
    kind: 'set' | 'update' | 'delete';
    ref: unknown;
    data?: unknown;
};
let lastTransactionOps: Op[] = [];
let transactionReadSnap: { exists: () => boolean; data: () => unknown } = {
    exists: () => false,
    data: () => ({}),
};

vi.mock('firebase/firestore', () => ({
    arrayUnion: vi.fn((...elements: unknown[]) => ({
        _op: 'arrayUnion',
        elements,
    })),
    arrayRemove: vi.fn((...elements: unknown[]) => ({
        _op: 'arrayRemove',
        elements,
    })),
    // `collection` and `doc` model real paths rather than returning undefined.
    // The stub they replace is why nothing caught a document-id range query
    // whose bounds were the same string, and so matched nothing, ever.
    collection: vi.fn((_firestore: unknown, ...segments: string[]) => ({
        _path: segments.join('/'),
    })),
    // Both call shapes: doc(firestore, 'chats', id) and doc(collectionRef, id).
    doc: vi.fn((parent: unknown, ...rest: string[]) => {
        const path =
            typeof parent === 'object' &&
            parent !== null &&
            '_path' in parent &&
            typeof parent._path === 'string'
                ? [parent._path, ...rest]
                : rest;
        return {
            _ref: {
                collection: path.slice(0, -1).join('/'),
                id: path[path.length - 1],
            },
        };
    }),
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    deleteField: vi.fn(() => ({ _op: 'deleteField' })),
    getDocs: vi.fn(async () => ({ docs: [] })),
    runTransaction: vi.fn(
        async (
            _firestore: unknown,
            fn: (tx: {
                get: (ref: unknown) => Promise<unknown>;
                set: (ref: unknown, data: unknown) => void;
                update: (ref: unknown, data: unknown) => void;
                delete: (ref: unknown) => void;
            }) => Promise<unknown>,
        ) => {
            const ops: Op[] = [];
            lastTransactionOps = ops;
            await fn({
                get: async () => transactionReadSnap,
                set: (ref, data) => {
                    ops.push({ kind: 'set', ref, data });
                },
                update: (ref, data) => {
                    ops.push({ kind: 'update', ref, data });
                },
                delete: (ref) => {
                    ops.push({ kind: 'delete', ref });
                },
            });
        },
    ),
    onSnapshot: vi.fn(() => () => {}),
    query: vi.fn((c: unknown) => c),
    where: vi.fn(),
    getDoc: vi.fn(async () => ({ exists: () => false })),
}));

vi.mock('@db/firebase', () => ({
    firestore: { _fake: true },
}));

vi.mock('@db/moderation/report', () => ({ default: vi.fn() }));
vi.mock('@db/moderation/moderate', () => ({ default: vi.fn() }));

vi.mock('@db/Database', () => ({
    HowTos: {},
    Projects: {},
}));

import sendModerate from '@db/moderation/moderate';
import sendReport from '@db/moderation/report';
import {
    getDoc,
    getDocs,
    onSnapshot,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import Chat, {
    ChatDatabase,
    MAX_REACTIONS_PER_MESSAGE,
    upgradeChat,
} from './ChatDatabase.svelte';

function makeChat(
    overrides: Partial<SerializedChat> = {},
    messages: SerializedMessage[] = [],
): Chat {
    return new Chat({
        v: 3,
        moderation: {},
        project: 'project-1',
        participants: ['user-1', 'user-2', 'user-3'],
        messages,
        unread: [],
        type: 'project',
        ...overrides,
    });
}

describe('ChatDatabase granular message operations', () => {
    let db: ChatDatabase;
    let mockDatabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        lastTransactionOps = [];
        transactionReadSnap = { exists: () => false, data: () => ({}) };

        mockDatabase = {
            getUser: vi.fn(() => ({ uid: 'user-1' })),
            track: vi.fn(<T>(p: Promise<T>) => p),
            write: vi.fn(<T>(p: Promise<T>) => p),
            reportBanner: vi.fn(),
            Projects: {
                listen: vi.fn(),
            },
            Galleries: {
                listen: vi.fn(),
            },
            HowTos: {
                addListener: vi.fn(),
            },
        };

        (getDocs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            docs: [],
        });

        db = new ChatDatabase(mockDatabase);
    });

    describe('addMessage', () => {
        it('arrayUnions the message and writes a recomputed unread list', async () => {
            const chat = makeChat();

            await db.addMessage(chat, 'hello world', undefined);

            expect(updateDoc).toHaveBeenCalledTimes(1);
            const [ref, data] = (
                updateDoc as unknown as ReturnType<typeof vi.fn>
            ).mock.calls[0];
            expect(ref).toMatchObject({
                _ref: { collection: 'chats', id: 'project-1' },
            });
            const d = data as { messages: unknown; unread: string[] };
            expect(d.messages).toMatchObject({ _op: 'arrayUnion' });
            const { elements } = d.messages as {
                elements: SerializedMessage[];
            };
            expect(elements).toHaveLength(1);
            expect(elements[0]).toMatchObject({
                creator: 'user-1',
                text: 'hello world',
            });
            // Everyone except the sender is marked unread.
            expect([...d.unread].sort()).toEqual(['user-2', 'user-3']);
        });

        it('tags the message with the chosen language when provided', async () => {
            const chat = makeChat();

            await db.addMessage(chat, 'hola', 'es');

            const [, data] = (updateDoc as unknown as ReturnType<typeof vi.fn>)
                .mock.calls[0];
            const { elements } = (data as { messages: unknown }).messages as {
                elements: SerializedMessage[];
            };
            expect(elements[0]).toMatchObject({
                text: 'hola',
                language: 'es',
            });
        });

        it('leaves the language field unset when no language is chosen', async () => {
            const chat = makeChat();

            await db.addMessage(chat, 'hello world', undefined);

            const [, data] = (updateDoc as unknown as ReturnType<typeof vi.fn>)
                .mock.calls[0];
            const { elements } = (data as { messages: unknown }).messages as {
                elements: SerializedMessage[];
            };
            expect(elements[0].language).toBeUndefined();
        });

        it('carries a reply parent and a code reference when given', async () => {
            const chat = makeChat();

            await db.addMessage(chat, 'this bit', undefined, 'root-1', {
                source: 0,
                path: [{ type: 'Program', index: 1 }],
                code: '1 + 1',
            });

            const [, data] = (updateDoc as unknown as ReturnType<typeof vi.fn>)
                .mock.calls[0];
            const { elements } = (data as { messages: unknown }).messages as {
                elements: SerializedMessage[];
            };
            expect(elements[0]).toMatchObject({
                replyTo: 'root-1',
                reference: {
                    source: 0,
                    path: [{ type: 'Program', index: 1 }],
                    code: '1 + 1',
                },
            });
        });

        it('leaves the reply and reference fields unset for an ordinary send', async () => {
            const chat = makeChat();

            await db.addMessage(chat, 'hello world', undefined);

            const [, data] = (updateDoc as unknown as ReturnType<typeof vi.fn>)
                .mock.calls[0];
            const { elements } = (data as { messages: unknown }).messages as {
                elements: SerializedMessage[];
            };
            expect(elements[0].replyTo).toBeUndefined();
            expect(elements[0].reference).toBeUndefined();
        });
    });

    describe('markChatRead', () => {
        it("arrayRemoves the uid from the chat's unread list", async () => {
            const chat = makeChat({ unread: ['user-1', 'user-2'] });

            await db.markChatRead(chat, 'user-1');

            expect(updateDoc).toHaveBeenCalledTimes(1);
            const [ref, data] = (
                updateDoc as unknown as ReturnType<typeof vi.fn>
            ).mock.calls[0];
            expect(ref).toMatchObject({
                _ref: { collection: 'chats', id: 'project-1' },
            });
            expect(data).toEqual({
                unread: { _op: 'arrayRemove', elements: ['user-1'] },
            });
        });
    });

    describe('setChatParticipants', () => {
        it('writes only the participants field so messages/unread are untouched', async () => {
            const chat = makeChat();

            await db.setChatParticipants(chat, ['user-1', 'user-4']);

            expect(updateDoc).toHaveBeenCalledTimes(1);
            const [, data] = (updateDoc as unknown as ReturnType<typeof vi.fn>)
                .mock.calls[0];
            expect(data).toEqual({ participants: ['user-1', 'user-4'] });
        });
    });

    describe('reportMessage', () => {
        it('asks the callable rather than writing the chat, and never names the reporter', async () => {
            // Reporting moved server-side in #938: a participant naming their
            // own reviewers is the same mistake as a creator clearing their own
            // strikes, and the report carries the message's text out of a
            // document every participant can read.
            const existing: SerializedMessage = {
                id: 'm1',
                time: 1000,
                creator: 'user-2',
                text: 'flagged content',
            };

            await db.reportMessage(makeChat({}, [existing]), existing);

            expect(sendReport).toHaveBeenCalledWith({
                kind: 'chat',
                subject: 'project-1',
                message: 'm1',
            });
            // Nothing about the reporter, and no write to the chat document.
            expect(lastTransactionOps).toHaveLength(0);
        });

        it('reflects the pending state locally so the message hides at once', async () => {
            const existing: SerializedMessage = {
                id: 'm1',
                time: 1000,
                creator: 'user-2',
                text: 'flagged content',
            };
            await db.reportMessage(makeChat({}, [existing]), existing);
            expect(db.chats.get('project-1')?.getMessageModeration('m1')).toBe(
                'pending',
            );
        });
    });

    describe('moderateMessage', () => {
        it('asks the callable, carrying the reason the decision found', async () => {
            const existing: SerializedMessage = {
                id: 'm1',
                time: 1000,
                creator: 'user-2',
                text: 'flagged content',
            };

            await db.moderateMessage(
                makeChat({}, [existing]),
                existing,
                'removed',
                { violence: true },
                'Please keep it kind.',
            );

            expect(sendModerate).toHaveBeenCalledWith(
                expect.objectContaining({
                    kind: 'chat',
                    subject: 'project-1',
                    message: 'm1',
                    flags: { violence: true },
                    note: 'Please keep it kind.',
                    // A curator's decision is never a platform warning.
                    strike: false,
                }),
            );
        });
    });

    describe('saveMessageTranslations', () => {
        // The chat's own messages decide what may be cached, so a chat with
        // none caches nothing. Two earlier tests here passed `makeChat()` with
        // no messages and then asserted setDoc was called; they could only ever
        // have failed.
        const messages: SerializedMessage[] = [
            { id: 'm1', time: 1, creator: 'user-2', text: 'hello' },
            { id: 'm2', time: 2, creator: 'user-3', text: 'world' },
        ];

        it("writes translated entries to the chat's language document with merge", async () => {
            await db.saveMessageTranslations(
                makeChat({}, messages),
                'es',
                new Map([
                    ['m1', 'hola'],
                    ['m2', 'mundo'],
                ]),
                {},
            );

            // Nothing touches the chat document itself.
            expect(lastTransactionOps).toHaveLength(0);
            expect(setDoc).toHaveBeenCalledTimes(1);
            const [ref, data, options] = (
                setDoc as unknown as ReturnType<typeof vi.fn>
            ).mock.calls[0];
            expect(ref).toMatchObject({
                _ref: { collection: 'chats/project-1/translations', id: 'es' },
            });
            expect(data).toEqual({ m1: 'hola', m2: 'mundo' });
            expect(options).toEqual({ merge: true });
        });

        it('does nothing when the translation map is empty', async () => {
            await db.saveMessageTranslations(
                makeChat({}, messages),
                'es',
                new Map(),
                {},
            );
            expect(setDoc).not.toHaveBeenCalled();
            expect(lastTransactionOps).toHaveLength(0);
        });

        it('never reads the document it is about to write', async () => {
            // What is cached is what the caller's live subscription already
            // delivered, so re-reading here would be a second round trip for an
            // answer in hand — and a racy one, since another viewer's merge
            // could land in between and lose its fresh entry as stale.
            await db.saveMessageTranslations(
                makeChat({}, messages),
                'fr',
                new Map([['m1', 'bonjour']]),
                { m2: 'monde' },
            );
            expect(getDoc).not.toHaveBeenCalled();
        });

        it('forgets what it holds for a message the chat no longer keeps', async () => {
            // A chat trims its own oldest messages past 128KB. A translation of
            // one that has gone would never be shown and would grow this
            // document without bound.
            await db.saveMessageTranslations(
                makeChat({}, messages),
                'es',
                new Map([['m1', 'hola']]),
                { gone: 'adiós' },
            );
            const [, data] = (setDoc as unknown as ReturnType<typeof vi.fn>)
                .mock.calls[0];
            expect(data).toEqual({
                m1: 'hola',
                gone: { _op: 'deleteField' },
            });
        });

        it('keeps the newest translations when they exceed the budget', async () => {
            // Newest first, matching which end of the conversation the chat
            // itself trims, so the cache stays a subset of what is readable.
            const long = 'x'.repeat(100_000);
            await db.saveMessageTranslations(
                makeChat({}, messages),
                'es',
                new Map([
                    ['m1', long],
                    ['m2', long],
                ]),
                {},
            );
            const [, data] = (setDoc as unknown as ReturnType<typeof vi.fn>)
                .mock.calls[0];
            expect(Object.keys(data)).toEqual(['m2']);
        });
    });

    describe('subscribeChatTranslations', () => {
        it('opens a snapshot listener on the sidecar document', () => {
            const cb = vi.fn();
            db.subscribeChatTranslations('project-1', 'es', cb);
            expect(onSnapshot).toHaveBeenCalledTimes(1);
            const [ref] = (onSnapshot as unknown as ReturnType<typeof vi.fn>)
                .mock.calls[0];
            expect(ref).toMatchObject({
                _ref: { collection: 'chats/project-1/translations', id: 'es' },
            });
        });

        it('returns an unsubscribe function from onSnapshot', () => {
            const unsub = db.subscribeChatTranslations(
                'project-1',
                'ja',
                vi.fn(),
            );
            expect(typeof unsub).toBe('function');
        });
    });

    describe('toggleReaction', () => {
        /** Let the transaction settle. The reaction write is deliberately not
         *  awaited — an announcement that waits for the network never comes —
         *  so the assertion has to wait for it rather than the caller. */
        const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

        /** The conversation the transaction will read back, holding one
         *  message with whatever reactions the test needs. */
        function readsMessage(message: SerializedMessage) {
            transactionReadSnap = {
                exists: () => true,
                data: () => ({
                    v: 3,
                    moderation: {},
                    project: 'project-1',
                    participants: ['user-1', 'user-2'],
                    messages: [message],
                    unread: [],
                    type: 'project',
                }),
            };
        }

        const message: SerializedMessage = {
            id: 'm1',
            time: 1000,
            creator: 'user-2',
            text: 'look at this',
        };

        it('adds the reacting creator to the emoji in a transaction', async () => {
            readsMessage(message);

            const added = db.toggleReaction(
                makeChat({}, [message]),
                message,
                '👍',
                true,
            );
            await settled();

            expect(added).toBe(true);
            const data = lastTransactionOps[0].data as {
                messages: SerializedMessage[];
            };
            expect(data.messages[0].reactions).toEqual({ '👍': ['user-1'] });
        });

        it('drops an emoji nobody is left choosing', async () => {
            const reacted = { ...message, reactions: { '👍': ['user-1'] } };
            readsMessage(reacted);

            db.toggleReaction(makeChat({}, [reacted]), reacted, '👍', false);
            await settled();

            // The emoji goes rather than being left as an empty list, and with
            // the last emoji gone the field goes too, so an abandoned reaction
            // doesn't sit in the document forever.
            const data = lastTransactionOps[0].data as {
                messages: SerializedMessage[];
            };
            expect(data.messages[0].reactions).toBeUndefined();
        });

        it('keeps other creators reacting when one takes theirs back', async () => {
            const reacted = {
                ...message,
                reactions: { '👍': ['user-1', 'user-2'] },
            };
            readsMessage(reacted);

            db.toggleReaction(makeChat({}, [reacted]), reacted, '👍', false);
            await settled();

            const data = lastTransactionOps[0].data as {
                messages: SerializedMessage[];
            };
            expect(data.messages[0].reactions).toEqual({ '👍': ['user-2'] });
        });

        it('stores a reaction under its bare codepoints', async () => {
            readsMessage(message);

            // ❤️ carries U+FE0F. A presentation selector says how a glyph is
            // drawn, not which glyph it is, so keying on it would give ❤ and
            // ❤️ one count each — and which one someone sent would depend on
            // whether they used the quick row or the chooser.
            db.toggleReaction(makeChat({}, [message]), message, '❤️', true);
            await settled();

            const data = lastTransactionOps[0].data as {
                messages: SerializedMessage[];
            };
            expect(Object.keys(data.messages[0].reactions ?? {})).toEqual([
                '❤',
            ]);
        });

        it('refuses a new emoji past the cap, and says so', async () => {
            // Full of distinct emoji, none of them the one being added.
            const reactions = Object.fromEntries(
                Array.from({ length: MAX_REACTIONS_PER_MESSAGE }, (_, i) => [
                    String.fromCodePoint(0x1f600 + i),
                    ['user-2'],
                ]),
            );
            const full = { ...message, reactions };
            readsMessage(full);

            const added = db.toggleReaction(
                makeChat({}, [full]),
                full,
                '🎉',
                true,
            );
            await settled();

            // Refused rather than silently ignored, so the caller can say why,
            // and nothing was written.
            expect(added).toBe(false);
            expect(lastTransactionOps).toHaveLength(0);
        });

        it('still lets a creator join an emoji the message already has when full', async () => {
            const reactions = Object.fromEntries(
                Array.from({ length: MAX_REACTIONS_PER_MESSAGE }, (_, i) => [
                    String.fromCodePoint(0x1f600 + i),
                    ['user-2'],
                ]),
            );
            const full = { ...message, reactions };
            readsMessage(full);

            const added = db.toggleReaction(
                makeChat({}, [full]),
                full,
                '😀',
                true,
            );
            await settled();

            expect(added).toBe(true);
        });
    });

    describe('deleteMessage', () => {
        it('uses a transaction that nulls the message text in-place', async () => {
            const existingMessage: SerializedMessage = {
                id: 'm1',
                time: 1000,
                creator: 'user-1',
                text: 'oops',
            };
            transactionReadSnap = {
                exists: () => true,
                data: () => ({
                    v: 3,
                    moderation: {},
                    project: 'project-1',
                    participants: ['user-1', 'user-2'],
                    messages: [existingMessage],
                    unread: [],
                    type: 'project',
                }),
            };

            await db.deleteMessage(
                makeChat({}, [existingMessage]),
                existingMessage,
            );

            const data = lastTransactionOps[0].data as {
                messages: SerializedMessage[];
            };
            expect(data.messages[0]).toMatchObject({
                id: 'm1',
                text: null,
            });
        });

        it('deletes the message from every language the chat has cached', async () => {
            const existingMessage: SerializedMessage = {
                id: 'm1',
                time: 1000,
                creator: 'user-1',
                text: 'oops',
            };
            transactionReadSnap = {
                exists: () => true,
                data: () => ({
                    v: 2,
                    project: 'project-1',
                    participants: ['user-1', 'user-2'],
                    messages: [existingMessage],
                    unread: [],
                    type: 'project',
                }),
            };
            (getDocs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
                docs: [
                    {
                        ref: {
                            _ref: {
                                collection: 'chats/project-1/translations',
                                id: 'es',
                            },
                        },
                    },
                ],
            });

            await db.deleteMessage(
                makeChat({}, [existingMessage]),
                existingMessage,
            );

            expect(updateDoc).toHaveBeenCalledTimes(1);
            const [ref, data] = (
                updateDoc as unknown as ReturnType<typeof vi.fn>
            ).mock.calls[0];
            expect(ref).toMatchObject({
                _ref: { collection: 'chats/project-1/translations', id: 'es' },
            });
            expect(data).toEqual({ m1: { _op: 'deleteField' } });
        });
    });
});

/**
 * Upgrade-on-load coverage for chats. Old chat docs are upgraded when a snapshot
 * arrives (upgradeChat), so a regression silently corrupts every pre-v2/v3 chat on
 * load. v1 → v2 adds the `type` discriminator; v2 → v3 adds an optional `language`.
 */
describe('withMergedMessages', () => {
    // Every call site is `incoming.withMergedMessages(existingLocalMessages)`,
    // so which side wins a collision decides whether a moderator's decision can
    // be shadowed by a stale local copy of the same message. It must be the
    // incoming one.
    it('keeps a local-only message the incoming chat has not seen yet', () => {
        const incoming = makeChat({}, [
            { id: 'm1', time: 1, creator: 'user-1', text: 'landed' },
        ]);
        const merged = incoming.withMergedMessages([
            { id: 'm2', time: 2, creator: 'user-1', text: 'still sending' },
        ]);
        expect(merged.getMessages().map((m) => m.id)).toEqual(['m1', 'm2']);
    });

    it('lets the incoming copy win a collision, so a decision is not shadowed', () => {
        // A decision lives on the chat's moderation map now, not on the
        // message, and the map is not merged per-message: whatever the incoming
        // chat says is what stands. A stale local copy therefore cannot hide a
        // takedown, which is what this asserted before the move.
        const incoming = makeChat({ moderation: { m1: 'removed' } }, [
            { id: 'm1', time: 1, creator: 'user-1', text: 'hi' },
        ]);
        const merged = incoming.withMergedMessages([
            { id: 'm1', time: 1, creator: 'user-1', text: 'hi' },
        ]);
        expect(merged.getMessageModeration('m1')).toBe('removed');
    });

    it('sorts the result by time', () => {
        const incoming = makeChat({}, [
            { id: 'm3', time: 3, creator: 'user-1', text: 'c' },
        ]);
        const merged = incoming.withMergedMessages([
            { id: 'm1', time: 1, creator: 'user-1', text: 'a' },
        ]);
        expect(merged.getMessages().map((m) => m.time)).toEqual([1, 3]);
    });
});

describe('upgradeChat (upgrade-on-load)', () => {
    /** A v2 chat carrying a `moderation` map the v2 type doesn't declare —
     *  which is the whole point: it is what a document looks like after the
     *  callables have written to it but before the migration has run. Built by
     *  spread rather than as one literal, since the field is genuinely not part
     *  of the v2 shape. */
    function v2WithModeration(
        messages: SerializedChatUnknownVersion['messages'],
        moderation: Record<string, string>,
    ): SerializedChatUnknownVersion {
        const base: SerializedChatUnknownVersion = {
            v: 2,
            project: 'p1',
            participants: ['u1'],
            messages,
            unread: [],
            type: 'project',
        };
        return { ...base, ...{ moderation } };
    }

    it('upgrades a v1 doc all the way to the current shape', () => {
        const v1 = {
            v: 1 as const,
            project: 'p1',
            participants: ['u1', 'u2'],
            messages: [{ id: 'm1', time: 1, creator: 'u1', text: 'hi' }],
            unread: ['u2'],
        };
        const upgraded = upgradeChat(v1);
        // v1 chains all the way through: the upgrader is recursive, so a
        // document that has sat untouched since v1 lands on the current shape
        // rather than one step along.
        expect(upgraded.v).toBe(3);
        expect(upgraded.type).toBe('project');
        expect(upgraded.language).toBeUndefined();
        // v1 user data is preserved across the upgrade.
        expect(upgraded.project).toBe('p1');
        expect(upgraded.participants).toEqual(['u1', 'u2']);
        expect(upgraded.messages).toHaveLength(1);
        expect(upgraded.messages[0]).toMatchObject({ id: 'm1', text: 'hi' });
        expect(upgraded.unread).toEqual(['u2']);
    });

    it('upgrades a v2 doc to v3, lifting moderation off its messages', () => {
        const upgraded = upgradeChat({
            v: 2,
            project: 'p1',
            participants: ['u1'],
            messages: [
                {
                    id: 'm1',
                    time: 1,
                    creator: 'u1',
                    text: 'hi',
                    moderation: 'removed',
                    reporter: 'u2',
                    moderator: 'u3',
                },
            ],
            unread: [],
            type: 'howto',
        });
        expect(upgraded.v).toBe(3);
        expect(upgraded.moderation).toEqual({ m1: 'removed' });
        // The reporter's identity is gone from the chat entirely — the whole
        // point of the move. Asserted on the object the listener actually uses,
        // which is this one and not zod's parse of it.
        expect(upgraded.messages[0]).not.toHaveProperty('reporter');
        expect(upgraded.messages[0]).not.toHaveProperty('moderator');
        expect(upgraded.messages[0]).not.toHaveProperty('moderation');
    });

    it('keeps a decision the server already wrote onto a v2 document', () => {
        // Rules, client, and functions all deploy together, so between that
        // deploy and the migration a chat sits at v2 while the callables write
        // the v3 map onto it — the Admin SDK writes one field, it doesn't bump
        // the version. Rebuilding the map from the messages alone would throw
        // that away, and a message someone had just reported would read as
        // deleted rather than as waiting for review.
        const upgraded = upgradeChat(
            v2WithModeration(
                [
                    { id: 'm1', time: 1, creator: 'u1', text: null },
                    { id: 'm2', time: 2, creator: 'u1', text: 'hi' },
                ],
                { m1: 'pending' },
            ),
        );
        expect(upgraded.moderation.m1).toBe('pending');
    });

    it('prefers the chat’s own map over a leftover field on a message', () => {
        // The message-level value is the stale one: it is what the old client
        // wrote, and the map is what the server has decided since.
        const upgraded = upgradeChat(
            v2WithModeration(
                [
                    {
                        id: 'm1',
                        time: 1,
                        creator: 'u1',
                        text: 'hi',
                        moderation: 'pending',
                    },
                ],
                { m1: 'removed' },
            ),
        );
        expect(upgraded.moderation.m1).toBe('removed');
    });

    it('ignores a moderation map that is not one', () => {
        const upgraded = upgradeChat(
            v2WithModeration(
                [{ id: 'm1', time: 1, creator: 'u1', text: 'hi' }],
                { m1: 'nonsense' },
            ),
        );
        expect(upgraded.moderation).toEqual({});
    });

    it('an already-latest v3 doc upgrades to itself', () => {
        const v3: SerializedChat = {
            v: 3,
            project: 'p1',
            participants: ['u1'],
            messages: [],
            moderation: {},
            unread: [],
            type: 'howto' as const,
        };
        expect(upgradeChat(v3)).toEqual(v3);
    });

    // `language` was added to v3 in place rather than as a v4, so a document
    // written before it existed and one written after are both v3 and both have
    // to survive the upgrader untouched.
    it('a v3 doc carries its language through unchanged', () => {
        const v3: SerializedChat = {
            v: 3,
            project: 'p1',
            participants: ['u1'],
            messages: [
                {
                    id: 'm1',
                    time: 1,
                    creator: 'u1',
                    text: 'hola',
                    language: 'es-MX',
                },
            ],
            moderation: {},
            unread: [],
            type: 'project',
            language: 'en-US',
        };
        expect(upgradeChat(v3)).toEqual(v3);
    });

    // `replyTo`, `reactions`, and `reference` were added to v3 in place for the
    // same reason `language` was. The v2 branch rebuilds each message field by
    // field, so a field it doesn't name is stripped on every read of a document
    // the migration hasn't reached — which would lose a reply's parent, all of
    // a message's reactions, and the code it is about, silently.
    it('carries replies, reactions, and references off a v2 doc', () => {
        const upgraded = upgradeChat({
            v: 2,
            project: 'p1',
            participants: ['u1'],
            messages: [
                { id: 'root', time: 1, creator: 'u1', text: 'look here' },
                {
                    id: 'm1',
                    time: 2,
                    creator: 'u2',
                    text: 'agreed',
                    replyTo: 'root',
                    reactions: { '👍': ['u1'] },
                    reference: {
                        source: 0,
                        path: [{ type: 'Program', index: 1 }],
                        code: '1 + 1',
                    },
                },
            ],
            unread: [],
            type: 'project',
        });

        expect(upgraded.messages[1]).toMatchObject({
            replyTo: 'root',
            reactions: { '👍': ['u1'] },
            reference: {
                source: 0,
                path: [{ type: 'Program', index: 1 }],
                code: '1 + 1',
            },
        });
    });

    it('a v3 doc carries its replies, reactions, and references unchanged', () => {
        const v3: SerializedChat = {
            v: 3,
            project: 'p1',
            participants: ['u1'],
            messages: [
                { id: 'root', time: 1, creator: 'u1', text: 'look here' },
                {
                    id: 'm1',
                    time: 2,
                    creator: 'u2',
                    text: 'agreed',
                    replyTo: 'root',
                    reactions: { '👍': ['u1'] },
                    reference: {
                        source: 0,
                        path: [{ type: 'Program', index: 1 }],
                        code: '1 + 1',
                    },
                },
            ],
            moderation: {},
            unread: [],
            type: 'project',
        };
        expect(upgradeChat(v3)).toEqual(v3);
    });

    it('throws on an unknown version', () => {
        // @ts-expect-error — deliberately invalid version for the test.
        expect(() => upgradeChat({ v: 999, project: 'p1' })).toThrow();
    });
});
