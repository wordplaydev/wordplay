import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stub the Firestore SDK so we can intercept the field-level operations the
// new granular helpers were introduced to call.
vi.mock('firebase/firestore', () => ({
    arrayUnion: vi.fn((...elements: unknown[]) => ({
        _op: 'arrayUnion',
        elements,
    })),
    arrayRemove: vi.fn((...elements: unknown[]) => ({
        _op: 'arrayRemove',
        elements,
    })),
    increment: vi.fn((n: number) => ({ _op: 'increment', value: n })),
    doc: vi.fn((_firestore: unknown, collection: string, id: string) => ({
        _ref: { collection, id },
    })),
    updateDoc: vi.fn(async () => {}),
    setDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(async () => ({ docs: [] })),
    getDocFromServer: vi.fn(async () => ({ exists: () => true, data: () => ({}) })),
}));

vi.mock('@db/firebase', () => ({
    firestore: { _fake: true },
}));

import {
    addFeedbackComment,
    removeFeedbackComment,
    voteFeedback,
    type FeedbackComment,
} from './FeedbackDatabase';
import {
    arrayRemove,
    arrayUnion,
    increment,
    updateDoc,
} from 'firebase/firestore';

describe('FeedbackDatabase atomic operations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('voteFeedback', () => {
        it('uses an atomic increment so concurrent voters do not clobber each other', async () => {
            await voteFeedback('feedback-1');

            expect(increment).toHaveBeenCalledWith(1);
            expect(updateDoc).toHaveBeenCalledTimes(1);

            const [ref, data] = (
                updateDoc as unknown as ReturnType<typeof vi.fn>
            ).mock.calls[0];
            expect(ref).toMatchObject({
                _ref: { collection: 'feedback', id: 'feedback-1' },
            });
            expect(data).toEqual({
                votes: { _op: 'increment', value: 1 },
            });
        });
    });

    describe('addFeedbackComment', () => {
        it('appends a comment via arrayUnion so concurrent commenters accumulate', async () => {
            const comment: FeedbackComment = {
                creator: 'user-1',
                text: 'hello',
                created: 1700000000000,
                moderator: false,
            };

            await addFeedbackComment('feedback-1', comment);

            expect(arrayUnion).toHaveBeenCalledWith(comment);
            expect(updateDoc).toHaveBeenCalledTimes(1);

            const [, data] = (updateDoc as unknown as ReturnType<typeof vi.fn>)
                .mock.calls[0];
            expect(data).toEqual({
                comments: { _op: 'arrayUnion', elements: [comment] },
            });
        });
    });

    describe('removeFeedbackComment', () => {
        it('removes a comment via arrayRemove', async () => {
            const comment: FeedbackComment = {
                creator: 'user-1',
                text: 'hello',
                created: 1700000000000,
                moderator: false,
            };

            await removeFeedbackComment('feedback-1', comment);

            expect(arrayRemove).toHaveBeenCalledWith(comment);
            expect(updateDoc).toHaveBeenCalledTimes(1);

            const [, data] = (updateDoc as unknown as ReturnType<typeof vi.fn>)
                .mock.calls[0];
            expect(data).toEqual({
                comments: { _op: 'arrayRemove', elements: [comment] },
            });
        });
    });
});
