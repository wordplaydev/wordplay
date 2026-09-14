import { describe, expect, test } from 'vitest';
import { UsernameLength, isValidUsername } from '@db/creators/username';
import {
    addressOf,
    baseUsername,
    describingCells,
    everyRowHasAnAddress,
} from './roster';

/**
 * A class is one kind of student throughout, so the roster's first column means
 * whatever the teacher's answer says it means. Getting that wrong either mints
 * accounts against the wrong text or refuses a roster that was fine.
 */

describe('reading an email roster', () => {
    test('the address is the first column', () => {
        expect(addressOf(['mia@school.edu', '204', 'Chen'], 'email')).toBe(
            'mia@school.edu',
        );
    });

    test('a password class has no address anywhere', () => {
        // The same row read the other way is all description — which is what a
        // teacher who switched their answer should see.
        expect(
            addressOf(['mia@school.edu', '204'], 'password'),
        ).toBeUndefined();
        expect(describingCells(['mia@school.edu', '204'], 'password')).toEqual([
            'mia@school.edu',
            '204',
        ]);
    });

    test('the address is not part of what names the student', () => {
        expect(
            describingCells(['mia@school.edu', '204', 'Chen'], 'email'),
        ).toEqual(['204', 'Chen']);
    });

    test('an empty first cell is not an address', () => {
        expect(addressOf(['', '204'], 'email')).toBeUndefined();
        expect(addressOf([], 'email')).toBeUndefined();
    });

    test('every line must start with an address', () => {
        expect(
            everyRowHasAnAddress([
                ['mia@school.edu'],
                ['sam@school.edu', '205'],
            ]),
        ).toBe(true);
        // A line that doesn't is the teacher's mistake, said plainly rather
        // than quietly becoming something else.
        expect(
            everyRowHasAnAddress([['mia@school.edu'], ['205', 'Ortiz']]),
        ).toBe(false);
        expect(everyRowHasAnAddress([['204', 'mia@school.edu']])).toBe(false);
        expect(everyRowHasAnAddress([])).toBe(false);
    });

    test('a synthesized address is not a mailbox', () => {
        expect(everyRowHasAnAddress([['alice@u.wordplay.dev']])).toBe(false);
    });

    test('a long TLD and a plus address are still addresses', () => {
        // isValidEmail, the older sign-in rule, refuses both — which is why the
        // roster uses isMailableAddress instead.
        expect(
            everyRowHasAnAddress([
                ['head@district.education'],
                ['a+b@school.org'],
            ]),
        ).toBe(true);
    });

    test('surrounding space does not make a line wrong', () => {
        expect(everyRowHasAnAddress([['  mia@school.edu  ']])).toBe(true);
        expect(addressOf(['  mia@school.edu  '], 'email')).toBe(
            'mia@school.edu',
        );
    });
});

describe('naming a student', () => {
    test('a name comes from the columns that describe them', () => {
        expect(baseUsername(['Chen', 'Mia'], 'mia@school.edu')).toBe('chemia');
    });

    test('the local part names them when the address is all there is', () => {
        expect(baseUsername([], 'mia.chen@school.edu')).toBe('miachen');
    });

    test('reserved characters are repaired rather than passed through', () => {
        // `o'bmar` is what this used to produce, which isValidUsername refuses —
        // so reserveUsername answered 'invalid' and the whole class failed with
        // "the username is not available".
        const name = baseUsername(["O'Brien", 'Mary'], undefined);
        expect(name).toBe('obrmar');
        expect(isValidUsername(name)).toBe(true);
    });

    test('a short name is padded by repetition, not by a counter', () => {
        // A counter on a one-character base never reaches UsernameLength, so
        // the caller's uniqueness loop would never terminate.
        const name = baseUsername(['A'], undefined);
        expect([...name]).toHaveLength(UsernameLength);
        expect(isValidUsername(name)).toBe(true);
    });

    test('padding keeps the name in one script', () => {
        // isValidUsername refuses a mixed-script name, so padding with Latin
        // digits or letters would make a Cyrillic roster unclaimable.
        expect(isValidUsername(baseUsername(['Ми'], undefined))).toBe(true);
    });

    test('nothing to go on still yields a claimable name', () => {
        expect(isValidUsername(baseUsername([], undefined))).toBe(true);
        expect(isValidUsername(baseUsername(['!!!'], undefined))).toBe(true);
    });

    test('numeric columns go last', () => {
        expect(baseUsername(['204', 'Chen'], undefined)).toBe('che204');
    });

    test('the roster row is not reordered', () => {
        // `sort` mutates, and the address is identified by position — so
        // sorting the caller's row would move it out of the first column.
        const row = ['204', 'Chen'];
        baseUsername(row, undefined);
        expect(row).toEqual(['204', 'Chen']);
    });
});
