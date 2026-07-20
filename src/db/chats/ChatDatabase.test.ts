import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SerializedChat, SerializedMessage } from './ChatDatabase.svelte';

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
    doc: vi.fn((_firestore: unknown, collection: string, id: string) => ({
        _ref: { collection, id },
    })),
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
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
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDoc: vi.fn(async () => ({ exists: () => false })),
}));

vi.mock('@db/firebase', () => ({
    firestore: { _fake: true },
}));

// Notifications is consumed at the top of ChatDatabase; we only need a stub.
vi.mock('@db/notifications.svelte', () => ({
    notifications: { add: vi.fn() },
}));

vi.mock('@db/Database', () => ({
    HowTos: {},
    Projects: {},
}));

import { ChatDatabase, upgradeChat } from './ChatDatabase.svelte';
import Chat from './ChatDatabase.svelte';
import { updateDoc } from 'firebase/firestore';

function makeChat(
    overrides: Partial<SerializedChat> = {},
    messages: SerializedMessage[] = [],
): Chat {
    return new Chat({
        v: 2,
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

        db = new ChatDatabase(mockDatabase);
    });

    describe('addMessage', () => {
        it('arrayUnions the message and writes a recomputed unread list', async () => {
            const chat = makeChat();

            await db.addMessage(chat, 'hello world');

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
        it('uses a transaction that mutates the matching message in-place', async () => {
            const existingMessage: SerializedMessage = {
                id: 'm1',
                time: 1000,
                creator: 'user-2',
                text: 'flagged content',
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

            await db.reportMessage(
                makeChat({}, [existingMessage]),
                existingMessage,
                'user-1',
            );

            expect(lastTransactionOps).toHaveLength(1);
            expect(lastTransactionOps[0]).toMatchObject({
                kind: 'update',
                ref: { _ref: { collection: 'chats', id: 'project-1' } },
            });
            const data = lastTransactionOps[0].data as {
                messages: SerializedMessage[];
            };
            expect(data.messages).toHaveLength(1);
            expect(data.messages[0]).toMatchObject({
                id: 'm1',
                moderation: 'pending',
                reporter: 'user-1',
            });
        });
    });

    describe('moderateMessage', () => {
        it('uses a transaction that updates moderation status on the matching message', async () => {
            const existingMessage: SerializedMessage = {
                id: 'm1',
                time: 1000,
                creator: 'user-2',
                text: 'flagged content',
                moderation: 'pending',
                reporter: 'user-1',
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

            await db.moderateMessage(
                makeChat({}, [existingMessage]),
                existingMessage,
                'removed',
                'mod-uid',
            );

            const data = lastTransactionOps[0].data as {
                messages: SerializedMessage[];
            };
            expect(data.messages[0]).toMatchObject({
                id: 'm1',
                moderation: 'removed',
                moderator: 'mod-uid',
            });
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
                    v: 2,
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
    });
});

/**
 * Upgrade-on-load coverage for chats. Old chat docs are upgraded when a snapshot
 * arrives (upgradeChat), so a regression silently corrupts every pre-v2 chat on
 * load. v1 → v2 adds the `type` discriminator (project vs how-to).
 */
describe('upgradeChat (upgrade-on-load)', () => {
    it('upgrades a v1 doc to v2, defaulting type to project', () => {
        const v1 = {
            v: 1 as const,
            project: 'p1',
            participants: ['u1', 'u2'],
            messages: [{ id: 'm1', time: 1, creator: 'u1', text: 'hi' }],
            unread: ['u2'],
        };
        const upgraded = upgradeChat(v1);
        expect(upgraded.v).toBe(2);
        expect(upgraded.type).toBe('project');
        // v1 user data is preserved across the upgrade.
        expect(upgraded.project).toBe('p1');
        expect(upgraded.participants).toEqual(['u1', 'u2']);
        expect(upgraded.messages).toHaveLength(1);
        expect(upgraded.messages[0]).toMatchObject({ id: 'm1', text: 'hi' });
        expect(upgraded.unread).toEqual(['u2']);
    });

    it('an already-latest v2 doc upgrades to itself', () => {
        const v2: SerializedChat = {
            v: 2,
            project: 'p1',
            participants: ['u1'],
            messages: [],
            unread: [],
            type: 'howto',
        };
        expect(upgradeChat(v2)).toEqual(v2);
    });

    it('throws on an unknown version', () => {
        // @ts-expect-error — deliberately invalid version for the test.
        expect(() => upgradeChat({ v: 999, project: 'p1' })).toThrow();
    });
});
