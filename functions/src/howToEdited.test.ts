import { describe, expect, it } from 'vitest';
import { howToContentChanged, requestedForGuide } from './howToEdited.js';
import { nextModeration } from './moderationRequest.js';

/**
 * Where a how-to's request to be listed in the guide stands (#906).
 *
 * Server-owned, so it is hard to exercise end to end and easy to get wrong
 * invisibly: a transition that never fires leaves a how-to out of the queue with
 * its author told it is waiting, and one that fires too readily unlists people's
 * work when someone bookmarks it. The pure halves are tested here, the way the
 * kit and gallery triggers' are.
 */

/** A how-to asking to be listed, with whatever this case changes. */
function howTo(fields: Record<string, unknown> = {}) {
    return {
        v: 4,
        title: '¶Spin a phrase¶/en-US',
        guidingQuestions: ['¶How?¶/en-US'],
        text: ['¶Like this.¶/en-US'],
        locales: ['en-US'],
        published: true,
        isPublic: true,
        submittedToGuide: true,
        collaborators: [],
        scopeOverwrite: false,
        xcoord: 0,
        ycoord: 0,
        social: { bookmarkers: [], viewCount: 0 },
        moderation: 'approved',
        moderatedAt: 1,
        ...fields,
    };
}

describe('whether a how-to is asking to be listed', () => {
    it('is all three, because a moderator can only approve what a reader can reach', () => {
        expect(requestedForGuide(howTo())).toBe(true);
        expect(requestedForGuide(howTo({ submittedToGuide: false }))).toBe(
            false,
        );
        expect(requestedForGuide(howTo({ published: false }))).toBe(false);
        expect(requestedForGuide(howTo({ isPublic: false }))).toBe(false);
    });

    it('is false for a document that predates the field', () => {
        const { submittedToGuide, ...legacy } = howTo();
        expect(requestedForGuide(legacy)).toBe(false);
    });
});

describe('what re-queues a listed how-to', () => {
    it.each([
        ['a new title', { title: '¶Spin two phrases¶/en-US' }],
        ['a reworded question', { guidingQuestions: ['¶Why?¶/en-US'] }],
        ['a rewritten answer', { text: ['¶Like that.¶/en-US'] }],
        [
            'an added answer',
            { text: ['¶Like this.¶/en-US', '¶And this.¶/en-US'] },
        ],
        ['a new language', { locales: ['en-US', 'es-MX'] }],
    ])('%s does', (_, change) => {
        expect(howToContentChanged(howTo(), howTo(change))).toBe(true);
    });

    it.each([
        // Writable by any gallery member or expanded-access viewer through the
        // rules' `social` opening, so counting it would let a reader unlist the
        // thing they were reading.
        ['a bookmark', { social: { bookmarkers: ['someone'], viewCount: 1 } }],
        // Writable by any gallery member through the placement opening, so
        // counting it would make dragging a tile a way to unlist it.
        ['a move on the canvas', { xcoord: 40, ycoord: 40 }],
        // Who may edit is not what a moderator read.
        ['a new collaborator', { collaborators: ['someone'] }],
        // Derived from `text`, and written separately, so it would re-queue on a
        // recompute that changed no prose.
        ['a recomputed preview', { preview: { text: 'x' } }],
        ['the trigger answering', { moderation: 'pending', moderatedAt: 2 }],
    ])('%s does not', (_, change) => {
        expect(howToContentChanged(howTo(), howTo(change))).toBe(false);
    });

    it('reordering the answers does, because each one answers its question', () => {
        const before = howTo({
            guidingQuestions: ['¶A?¶/en-US', '¶B?¶/en-US'],
            text: ['¶One.¶/en-US', '¶Two.¶/en-US'],
        });
        const after = howTo({
            guidingQuestions: ['¶A?¶/en-US', '¶B?¶/en-US'],
            text: ['¶Two.¶/en-US', '¶One.¶/en-US'],
        });
        expect(howToContentChanged(before, after)).toBe(true);
    });
});

describe('the transition the trigger applies', () => {
    const next = (howToRecord: Record<string, unknown>, changed = false) =>
        nextModeration(
            typeof howToRecord.moderation === 'string'
                ? howToRecord.moderation
                : 'unrequested',
            requestedForGuide(howToRecord),
            changed,
        );

    it('asking for the first time queues it', () => {
        expect(next(howTo({ moderation: 'unrequested' }))).toBe('pending');
    });

    it('editing what was approved queues it again', () => {
        expect(next(howTo({ moderation: 'approved' }), true)).toBe('pending');
    });

    it('a bookmark on an approved how-to leaves it listed', () => {
        expect(next(howTo({ moderation: 'approved' }), false)).toBe('approved');
    });

    it('going private takes it out of the guide with no delisting branch', () => {
        expect(next(howTo({ moderation: 'approved', isPublic: false }))).toBe(
            'unrequested',
        );
    });

    it('and so does taking the request back', () => {
        expect(
            next(howTo({ moderation: 'approved', submittedToGuide: false })),
        ).toBe('unrequested');
    });

    it('a denial can be answered by asking again', () => {
        // The request is on again, which is the creator pressing the button.
        expect(next(howTo({ moderation: 'denied' }))).toBe('pending');
    });

    it('but a refusal that took the request with it stands', () => {
        // The decision clears `submittedToGuide`, so without the trigger's own
        // guard this would answer `unrequested` — erasing the refusal in the
        // same write that recorded it, and leaving the creator no explanation.
        // The guard is in the handler; what this pins is why it has to be.
        const refused = howTo({
            moderation: 'denied',
            submittedToGuide: false,
        });
        expect(requestedForGuide(refused)).toBe(false);
        expect(next(refused)).toBe('unrequested');
    });

    it('settles, because the trigger writes nothing when nothing moved', () => {
        // The write this trigger makes comes back through it. `nextModeration`
        // is idempotent and `howToContentChanged` is blind to the fields it
        // writes, so the second pass computes the same answer and stops.
        const answered = howTo({ moderation: 'pending', moderatedAt: 2 });
        expect(next(answered, howToContentChanged(howTo(), answered))).toBe(
            'pending',
        );
    });
});
