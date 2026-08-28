import { describe, expect, it } from 'vitest';
import { galleryContentChanged, nextModeration } from './galleryEdited.js';

/**
 * The curated public listing's state machine (#1311).
 *
 * This is the one thing a curator must not be able to write — `public` is their
 * request, `moderation` is the answer — so it lives in a Firestore trigger.
 * That makes it hard to exercise end to end, and easy to get wrong in a way
 * that is invisible: a transition that never fires leaves a gallery stuck in
 * the queue, and one that fires on this function's own write re-triggers
 * forever. Both are pinned here.
 */
describe('nextModeration', () => {
    it('asks for review when a gallery first goes public', () => {
        expect(nextModeration('unrequested', true, false)).toBe('pending');
    });

    it('asks again after a denial, so a curator can fix and resubmit', () => {
        expect(nextModeration('denied', true, false)).toBe('pending');
    });

    it('leaves an approved gallery alone while nothing about it changes', () => {
        expect(nextModeration('approved', true, false)).toBe('approved');
    });

    it('re-reviews an approved gallery whose content changed', () => {
        expect(nextModeration('approved', true, true)).toBe('pending');
    });

    it('is idle on a pending gallery, however it was edited', () => {
        expect(nextModeration('pending', true, false)).toBe('pending');
        expect(nextModeration('pending', true, true)).toBe('pending');
    });

    it('clears the request when a gallery stops being public', () => {
        for (const state of ['pending', 'approved', 'denied', 'unrequested'])
            expect(nextModeration(state, false, true)).toBe('unrequested');
    });

    it('is idempotent, so the trigger stops rather than looping', () => {
        // Each state, fed its own output with nothing else changed, has to stay
        // put — this function's write comes back through the same trigger.
        for (const state of ['unrequested', 'pending', 'approved', 'denied'])
            for (const isPublic of [true, false]) {
                const once = nextModeration(state, isPublic, false);
                expect(nextModeration(once, isPublic, false)).toBe(once);
            }
    });
});

describe('galleryContentChanged', () => {
    const base = {
        name: { 'en-US': 'Games' },
        description: { 'en-US': 'Fun' },
        projects: ['a', 'b'],
    };

    it('sees a rename', () => {
        expect(
            galleryContentChanged(base, { ...base, name: { 'en-US': 'Toys' } }),
        ).toBe(true);
    });

    it('sees a new description', () => {
        expect(
            galleryContentChanged(base, {
                ...base,
                description: { 'en-US': 'Serious' },
            }),
        ).toBe(true);
    });

    it('sees a project added or removed', () => {
        expect(
            galleryContentChanged(base, { ...base, projects: ['a', 'b', 'c'] }),
        ).toBe(true);
        expect(galleryContentChanged(base, { ...base, projects: ['a'] })).toBe(
            true,
        );
    });

    it('ignores a reordering, which changes nothing a moderator judged', () => {
        expect(
            galleryContentChanged(base, { ...base, projects: ['b', 'a'] }),
        ).toBe(false);
    });

    it('ignores the fields this trigger writes itself', () => {
        // Otherwise its own write reads as a change and it re-triggers forever.
        expect(
            galleryContentChanged(base, {
                ...base,
                moderation: 'approved',
                moderatedAt: 1,
                words: ['games', 'fun'],
                flags: { violence: true },
            }),
        ).toBe(false);
    });

    it('treats a newly created gallery as changed, so it gets indexed', () => {
        expect(galleryContentChanged(undefined, base)).toBe(true);
    });
});
