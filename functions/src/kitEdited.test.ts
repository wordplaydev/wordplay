import { describe, expect, it } from 'vitest';
import {
    claimChanged,
    kitIndexText,
    unlists,
    versionAdded,
} from './kitEdited.js';
import { foldWords } from './searchWords.js';
import { nextModeration } from './moderationRequest.js';

/**
 * A kit's search index and its listing decision (#8).
 *
 * Both are server-owned, which makes them hard to exercise end to end and easy to get
 * wrong invisibly: an index that is never built leaves every kit unfindable while the
 * registry looks like it works, and a transition that never fires leaves a kit stuck
 * out of the queue forever. So the pure halves are tested here, the way the gallery
 * trigger's are.
 */

describe('what a kit is findable by', () => {
    it('indexes the name, the description, and what it shares', () => {
        // Export names are in on purpose: someone looking for a `fade` is not looking
        // for a kit that happens to be called "colors".
        expect(
            foldWords(
                kitIndexText({
                    name: 'amy/colors',
                    description: 'Warm palettes.',
                    exports: ['sunset', 'fade'],
                }),
            ).sort(),
        ).toEqual(['amy', 'colors', 'fade', 'palettes', 'sunset', 'warm']);
    });

    it("splits the owner off the kit's own name", () => {
        // `amy/colors` is one stored string, but someone searching types one or the
        // other, never the slash.
        expect(foldWords(kitIndexText({ name: 'amy/colors' }))).toContain(
            'amy',
        );
        expect(foldWords(kitIndexText({ name: 'amy/colors' }))).toContain(
            'colors',
        );
    });

    it('tolerates a document missing any of it', () => {
        expect(foldWords(kitIndexText({}))).toEqual([]);
        expect(foldWords(kitIndexText({ exports: [1, null] }))).toEqual([]);
    });

    it('folds case and accents the way the gallery index does', () => {
        expect(foldWords(['Crème Brûlée'])).toEqual(['crème', 'brûlée']);
    });
});

describe('whether a kit is listed', () => {
    it('does not list a kit whose creator has not asked', () => {
        expect(nextModeration('unrequested', false, true)).toBe('unrequested');
    });

    it('queues a kit the moment its creator asks', () => {
        // The client only ever writes `public`; the rules refuse it `moderation`.
        expect(nextModeration('unrequested', true, false)).toBe('pending');
    });

    it('re-queues an approved kit whose content changed', () => {
        // Approval was of what the kit was — its name, what it says it is, and which
        // version is newest — not of whatever it becomes.
        expect(nextModeration('approved', true, true)).toBe('pending');
    });

    it('leaves an approved kit alone when nothing changed', () => {
        // This trigger's own write comes back through it, so a transition that fired
        // on no change would loop.
        expect(nextModeration('approved', true, false)).toBe('approved');
    });

    it('lets a denied kit ask again', () => {
        expect(nextModeration('denied', true, true)).toBe('pending');
    });

    it('unlists a kit whose creator withdraws it', () => {
        expect(nextModeration('approved', false, false)).toBe('unrequested');
    });
});

describe('what costs a kit its listing', () => {
    const listed = {
        name: 'amy/colors',
        description: 'warm colours',
        exports: ['sunset'],
        kinds: ['Color'],
        latest: 1,
        public: true,
        listed: true,
    };

    it('a new version keeps the listing the approved one earned', () => {
        // The whole point of the split: publishing v2 must not take v1 out of the
        // registry, because v1 is what a moderator approved and it has not changed.
        const after = { ...listed, latest: 2 };
        expect(versionAdded(listed, after)).toBe(true);
        expect(claimChanged(listed, after)).toBe(false);
        expect(unlists(listed, after)).toBe(false);
    });

    it('but it does re-enter the queue', () => {
        // Still new code to have approved — `moderation` goes back to pending even though
        // `listed` stays, which is what keeps it in the moderator's queue.
        expect(
            nextModeration(
                'approved',
                true,
                claimChanged(listed, { ...listed, latest: 2 }) ||
                    versionAdded(listed, { ...listed, latest: 2 }),
            ),
        ).toBe('pending');
    });

    it.each([
        ['name', { name: 'amy/colours' }],
        ['description', { description: 'something else' }],
        ['exports', { exports: ['sunset', 'dawn'] }],
        ['kinds', { kinds: ['Color', 'Phrase'] }],
    ])(
        'a changed %s unlists it, because the registry shows it live',
        (_, change) => {
            const after = { ...listed, ...change };
            expect(claimChanged(listed, after)).toBe(true);
            expect(unlists(listed, after)).toBe(true);
        },
    );

    it('withdrawing the request unlists it', () => {
        expect(unlists(listed, { ...listed, public: false })).toBe(true);
    });

    it('an unchanged kit stays exactly as it is', () => {
        // This trigger's own write comes back through it, so a decision that fired on no
        // change would loop.
        expect(claimChanged(listed, listed)).toBe(false);
        expect(versionAdded(listed, listed)).toBe(false);
        expect(unlists(listed, listed)).toBe(false);
    });

    it('cannot arrive already listed, however the document was written', () => {
        // `claimChanged` is true whenever `before` is undefined, so every create is a
        // fresh submission. That is what stops a kit listing itself — including one
        // written straight to Firestore through the Admin SDK, which bypasses the rules
        // but not this trigger. A test fixture that writes `listed: true` on a create is
        // not pre-approving a kit, it is racing the trigger that resets it.
        expect(unlists(undefined, listed)).toBe(true);
        expect(
            nextModeration(
                'approved',
                true,
                claimChanged(undefined, listed) ||
                    versionAdded(undefined, listed),
            ),
        ).toBe('pending');
    });

    it('a kit that was never listed has no listing to lose', () => {
        const unlisted = { ...listed, listed: false };
        expect(unlists(unlisted, { ...unlisted, name: 'amy/other' })).toBe(
            false,
        );
    });
});
