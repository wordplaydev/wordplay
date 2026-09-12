import { describe, expect, it } from 'vitest';
import {
    curatorsChanged,
    deriveHowToViewers,
    flattenHowToViewers,
    galleryContentChanged,
    howToViewersChanged,
    sameIdList,
    sharesCurator,
    type HowToSource,
} from './galleryEdited.js';
import { nextModeration } from './moderationRequest.js';

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
        characters: ['c1'],
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

/**
 * Whose reports get re-routed when a gallery's curators change (#938).
 *
 * `moderators` is denormalized onto each report so the curator queue's read
 * rule needs no get() of the gallery, which means adding or removing a curator
 * has to be pushed out to the open reports. Firing when nothing changed would
 * rewrite every open report on every gallery write — including this function's
 * own writes, which come back through the same trigger.
 */
/**
 * The membership comparison the trigger gates on. It ran as an unexported
 * `listEq` typed `string[]` and indexed straight into `.length`, so a gallery
 * document without `curators` or `creators` threw — killing the invocation, and
 * throwing again on every later edit, because the trigger's own write comes back
 * through it. `page-preview.spec.ts` writes exactly such a fixture.
 */
describe('sameIdList', () => {
    it('compares lists as sets, ignoring order', () => {
        expect(sameIdList(['a', 'b'], ['b', 'a'])).toBe(true);
        expect(sameIdList(['a'], ['a', 'b'])).toBe(false);
        expect(sameIdList([], [])).toBe(true);
    });

    it('treats a missing list as empty rather than throwing', () => {
        expect(sameIdList(undefined, [])).toBe(true);
        expect(sameIdList([], undefined)).toBe(true);
        expect(sameIdList(undefined, undefined)).toBe(true);
        expect(sameIdList(undefined, ['a'])).toBe(false);
        expect(sameIdList(['a'], undefined)).toBe(false);
    });

    it('treats a value that is not a list as empty', () => {
        // A trigger reads whatever is stored, and nothing validates it on the
        // way in — so a malformed field must not be able to kill the function.
        expect(sameIdList('a', [])).toBe(true);
        expect(sameIdList(null, undefined)).toBe(true);
        expect(sameIdList({ 0: 'a' }, ['a'])).toBe(false);
    });
});

describe('curatorsChanged', () => {
    it('is true when a curator is added', () => {
        expect(
            curatorsChanged({ curators: ['a'] }, { curators: ['a', 'b'] }),
        ).toBe(true);
    });

    it('is true when a curator is removed', () => {
        expect(
            curatorsChanged({ curators: ['a', 'b'] }, { curators: ['a'] }),
        ).toBe(true);
    });

    it('is false when only the order differs', () => {
        // The list is a set; a reordering is not a change of who may review.
        expect(
            curatorsChanged({ curators: ['a', 'b'] }, { curators: ['b', 'a'] }),
        ).toBe(false);
    });

    it('is false when something else about the gallery changed', () => {
        expect(
            curatorsChanged(
                { curators: ['a'], name: { en: 'one' } },
                { curators: ['a'], name: { en: 'two' } },
            ),
        ).toBe(false);
    });

    it('is false for a brand new gallery, which has no reports to fix up', () => {
        expect(curatorsChanged(undefined, { curators: ['a'] })).toBe(false);
    });

    it('treats a missing list as empty rather than throwing', () => {
        expect(curatorsChanged({}, { curators: ['a'] })).toBe(true);
        expect(curatorsChanged({ curators: ['a'] }, {})).toBe(true);
    });
});

/**
 * Characters are gallery content too (#822), so a change to them re-opens an
 * approval the same way a change to projects does — approval was of what the
 * gallery was.
 */
describe('galleryContentChanged with characters', () => {
    const base = {
        name: { 'en-US': 'Games' },
        description: { 'en-US': 'Fun' },
        projects: ['a'],
        characters: ['c1'],
    };

    it('sees a character added', () => {
        expect(
            galleryContentChanged(base, {
                ...base,
                characters: ['c1', 'c2'],
            }),
        ).toBe(true);
    });

    it('sees a character removed', () => {
        expect(galleryContentChanged(base, { ...base, characters: [] })).toBe(
            true,
        );
    });

    it('ignores a reordering, since membership is a set', () => {
        expect(
            galleryContentChanged(
                { ...base, characters: ['c1', 'c2'] },
                { ...base, characters: ['c2', 'c1'] },
            ),
        ).toBe(false);
    });

    it('treats a gallery stored before #822 as having no characters', () => {
        // The field is absent on every gallery until its first upgrade write,
        // and reading it as a change would re-queue every approved gallery.
        const legacy = { ...base };
        delete (legacy as { characters?: string[] }).characters;
        expect(galleryContentChanged(legacy, { ...legacy })).toBe(false);
        expect(
            galleryContentChanged(legacy, { ...legacy, characters: [] }),
        ).toBe(false);
    });
});

/**
 * Who may view a gallery's how-tos through expanded access. This used to be
 * computed on the client and written straight to the document, so anyone who
 * could edit a gallery could grant its how-tos to anyone they named (#1352).
 * The derivation is the server's now, and these are its rules.
 */
describe('deriveHowToViewers', () => {
    const Curator = 'curator';
    const Other = 'other-curator';
    const sources = new Map<string, HowToSource>([
        ['shared', { curators: [Curator], creators: ['student-a'] }],
        ['theirs', { curators: [Other], creators: ['student-b'] }],
        ['both', { curators: [Curator, Other], creators: ['student-a'] }],
    ]);

    it('draws viewers from a gallery the same curator curates', () => {
        expect(deriveHowToViewers(['shared'], sources, [Curator])).toEqual({
            howToViewers: { shared: [Curator, 'student-a'] },
            howToViewersFlat: [Curator, 'student-a'],
        });
    });

    it('draws nothing from a gallery they have nothing to do with', () => {
        // The disclosure this closes: `howToViewersFlat` is readable by everyone
        // who can read the gallery, so copying a stranger's members into it
        // publishes their membership.
        expect(deriveHowToViewers(['theirs'], sources, [Curator])).toEqual({
            howToViewers: {},
            howToViewersFlat: [],
        });
    });

    it('one curator in common is enough', () => {
        expect(deriveHowToViewers(['both'], sources, [Curator])).toEqual({
            howToViewers: { both: [Curator, Other, 'student-a'] },
            howToViewersFlat: [Curator, Other, 'student-a'],
        });
    });

    it('skips a gallery that is no longer there', () => {
        expect(deriveHowToViewers(['gone'], sources, [Curator])).toEqual({
            howToViewers: {},
            howToViewersFlat: [],
        });
    });

    it('lists someone reachable through two galleries once', () => {
        const { howToViewersFlat } = deriveHowToViewers(
            ['shared', 'both'],
            sources,
            [Curator],
        );
        expect(howToViewersFlat).toEqual([Curator, Other, 'student-a']);
    });

    it('gives nothing when no gallery is named', () => {
        expect(deriveHowToViewers([], sources, [Curator])).toEqual({
            howToViewers: {},
            howToViewersFlat: [],
        });
    });

    it('is deterministic, so the trigger stops rather than looping', () => {
        // The handler diffs this against what is stored and writes only on a
        // difference; its own write comes back through the same trigger. An
        // answer that varied by input order — which the flat list did, before it
        // was sorted — would be a document that rewrites itself forever.
        const once = deriveHowToViewers(['shared', 'both'], sources, [Curator]);
        const again = deriveHowToViewers(['both', 'shared'], sources, [
            Curator,
        ]);
        expect(JSON.stringify(again)).toEqual(JSON.stringify(once));
    });
});

describe('howToViewersChanged', () => {
    const derived = {
        howToViewers: { a: ['x', 'y'] },
        howToViewersFlat: ['x', 'y'],
    };

    it('is false against a gallery that already stores the answer', () => {
        expect(howToViewersChanged({ ...derived }, derived)).toBe(false);
    });

    it('ignores the order the map happens to be stored in', () => {
        const stored = {
            howToViewers: { b: ['z'], a: ['x', 'y'] },
            howToViewersFlat: ['x', 'y', 'z'],
        };
        expect(
            howToViewersChanged(stored, {
                howToViewers: { a: ['x', 'y'], b: ['z'] },
                howToViewersFlat: ['x', 'y', 'z'],
            }),
        ).toBe(false);
    });

    it('sees a viewer gained or lost', () => {
        expect(
            howToViewersChanged(
                { howToViewers: { a: ['x'] }, howToViewersFlat: ['x'] },
                derived,
            ),
        ).toBe(true);
    });

    it('treats a gallery stored before these fields existed as changed', () => {
        expect(howToViewersChanged({}, derived)).toBe(true);
    });
});

describe('sharesCurator and flattenHowToViewers', () => {
    it('shares nothing with an empty list', () => {
        expect(sharesCurator([], ['a'])).toBe(false);
        expect(sharesCurator(['a'], [])).toBe(false);
    });

    it('flattens, dedupes and sorts', () => {
        expect(flattenHowToViewers({ b: ['z', 'x'], a: ['x'] })).toEqual([
            'x',
            'z',
        ]);
    });
});
