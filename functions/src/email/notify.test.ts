import { describe, expect, test } from 'vitest';
import { localeOf, mayEmail, preferenceOf, type Candidate } from './notify.js';

/**
 * Who Wordplay may write to.
 *
 * The most safety-relevant decision in the email work, and the reason it is one
 * function rather than a filter spread across a loop: "never email a child" has
 * to be provable, not merely intended.
 */

const Now = 1_000_000;

function candidate(over: Partial<Candidate> = {}): Candidate {
    return {
        email: 'someone@example.com',
        emailVerified: true,
        emailEligibleOn: undefined,
        settings: {},
        ...over,
    };
}

describe('who may be written to', () => {
    test('someone with a real, verified address', () => {
        expect(mayEmail(candidate(), 'decisions', Now)).toBe(true);
    });

    test('but never a synthesized username address', () => {
        // A creator too young to hold an email address signs in as one of
        // these, which receives no mail. This is what makes the age rule true
        // by construction rather than by a check someone has to remember.
        expect(
            mayEmail(
                candidate({ email: 'alice@u.wordplay.dev' }),
                'decisions',
                Now,
            ),
        ).toBe(false);
    });

    test('nor an account with no address at all', () => {
        expect(
            mayEmail(candidate({ email: undefined }), 'decisions', Now),
        ).toBe(false);
    });

    test('nor one whose address is unverified', () => {
        // An unverified address is not known to belong to whoever is reading.
        expect(
            mayEmail(candidate({ emailVerified: false }), 'decisions', Now),
        ).toBe(false);
    });

    test('nor anyone not yet old enough to consent to us holding one', () => {
        expect(
            mayEmail(candidate({ emailEligibleOn: Now + 1 }), 'decisions', Now),
        ).toBe(false);
    });

    test('but the day they become eligible, they may', () => {
        expect(
            mayEmail(candidate({ emailEligibleOn: Now }), 'decisions', Now),
        ).toBe(true);
    });

    test('and an absent eligibility date is not a refusal', () => {
        // Absent means "made before #628, or a class student" — which is not
        // the same as "old enough". The address check above is what actually
        // protects a class student, since theirs is synthesized.
        expect(
            mayEmail(
                candidate({ emailEligibleOn: undefined }),
                'decisions',
                Now,
            ),
        ).toBe(true);
    });

    test('nor anyone who turned this kind off', () => {
        expect(
            mayEmail(
                candidate({
                    settings: { emailNotifications: { decisions: false } },
                }),
                'decisions',
                Now,
            ),
        ).toBe(false);
    });
});

describe('what a group does when nobody has chosen', () => {
    test.each([
        ['decisions', true],
        ['reviews', true],
        ['activity', false],
    ] as const)('%s defaults to %s', (group, expected) => {
        // Social mail is off unless asked for; a decision about your own work
        // is something you would expect to hear about.
        expect(preferenceOf(undefined, group)).toBe(expected);
        expect(preferenceOf({}, group)).toBe(expected);
        expect(preferenceOf({ emailNotifications: {} }, group)).toBe(expected);
    });

    test('and a choice beats the default in both directions', () => {
        expect(
            preferenceOf(
                { emailNotifications: { activity: true } },
                'activity',
            ),
        ).toBe(true);
        expect(
            preferenceOf(
                { emailNotifications: { decisions: false } },
                'decisions',
            ),
        ).toBe(false);
    });

    test('a settings document of the wrong shape falls back rather than throwing', () => {
        // Read defensively: a document written by a client we no longer ship
        // must not stop a decision reaching its author.
        for (const settings of [null, 'nonsense', 7, { emailNotifications: 3 }])
            expect(preferenceOf(settings, 'decisions')).toBe(true);
    });
});

describe('which language to write in', () => {
    test.each([
        [{ locales: ['es-MX', 'en-US'] }, 'es-MX'],
        [{ locales: [] }, undefined],
        [{}, undefined],
        [null, undefined],
        [{ locales: 'es-MX' }, undefined],
    ])('%o reads as %s', (settings, expected) => {
        expect(localeOf(settings)).toBe(expected);
    });
});
