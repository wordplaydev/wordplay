import type { ClaimName } from 'shared-types';
import { expect, test } from 'vitest';
// The callables' own copy of the rule. `functions/` compiles with its own
// `rootDir` and can't import this side; this side can import it, which is what
// lets one table hold both to the same contract.
import { hasClaim as hasClaimOnServer } from '../../../functions/src/claims';
import { hasClaim } from './getClaim';

/** Every shape of claims the app can store, and what each one carries.
 *
 *  The point of the table is the `admin` rows: it implies `mod` and `teacher`
 *  but never `banned`, and that asymmetry is the whole design. */
const cases: [
    string,
    Record<string, unknown> | undefined | null,
    ClaimName,
    boolean,
][] = [
    ['nothing at all', undefined, 'mod', false],
    ['null', null, 'mod', false],
    ['an empty set', {}, 'admin', false],
    ['an empty set', {}, 'mod', false],
    ['an empty set', {}, 'teacher', false],
    ['an empty set', {}, 'banned', false],

    ['a moderator', { mod: true }, 'mod', true],
    ['a moderator', { mod: true }, 'teacher', false],
    ['a moderator', { mod: true }, 'admin', false],

    ['a teacher', { teacher: true }, 'teacher', true],
    ['a teacher', { teacher: true }, 'mod', false],

    // The superuser rows.
    ['an administrator', { admin: true }, 'admin', true],
    ['an administrator', { admin: true }, 'mod', true],
    ['an administrator', { admin: true }, 'teacher', true],
    // The one thing being a superuser does not get you.
    ['an administrator', { admin: true }, 'banned', false],
    ['a banned administrator', { admin: true, banned: true }, 'banned', true],
    ['a banned administrator', { admin: true, banned: true }, 'mod', true],

    // A claim removed by scripts/claims.js is written `false`, not deleted,
    // so `in`-style tests have to check the value too.
    ['a former moderator', { mod: false }, 'mod', false],
    ['a former administrator', { admin: false }, 'mod', false],

    ['a banned creator', { banned: true }, 'banned', true],
    ['a banned creator', { banned: true }, 'mod', false],
];

test.each(cases)(
    '%s: hasClaim(_, %s) is %s on both sides',
    (_, claims, claim, expected) => {
        expect(hasClaim(claims, claim)).toBe(expected);
        expect(hasClaimOnServer(claims, claim)).toBe(expected);
    },
);
