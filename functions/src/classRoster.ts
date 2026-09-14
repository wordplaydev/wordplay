import type { ClassSigninMethod } from 'shared-types';
import {
    foldUsername,
    isMailableAddress,
    isValidUsername,
    usernameEmail,
    usernameFromEmail,
} from './username.js';

/**
 * What a teacher's roster means, decided before anything is created (#1347).
 *
 * A class is one kind of student throughout: either every account signs in as
 * `<username>@u.wordplay.dev` with a password, or every one signs in by a link
 * emailed to an address the teacher supplied. The method is carried once, on
 * the reading, rather than once per student — which is what makes a mixed
 * roster unrepresentable here rather than merely unexpected.
 *
 * Every check lives here rather than inline in the handler so it can be tested
 * without standing up firebase-admin, and — the reason that matters — so none
 * of it runs after an account exists. A name refused by `reserveUsername`
 * halfway through a roster costs a round of reservations and reports the class
 * as unavailable; refused here it costs nothing.
 *
 * Imports only `./username.js`, which imports nothing, so classRoster.test.ts
 * runs in the root vitest project.
 */

/** Mirrors joinAccount's floor and the client's PasswordLength. */
export const MinimumPasswordLength = 6;

export type RosterStudent = {
    /** The handle to claim. For an address that already has an account, this is
     *  what the form proposed — that account's own handle overrides it. */
    username: string;
    /** What Firebase Auth signs this account in with: the teacher's address, or
     *  one synthesized from the username. */
    address: string;
    /** Absent in an email class, whose students have no password at all. */
    password: string | undefined;
    meta: string[];
};

export type RosterProblem = {
    kind: 'account' | 'affirmation' | 'generic';
    info: string;
};

export type RosterReading =
    | { method: ClassSigninMethod; students: RosterStudent[] }
    | { problem: RosterProblem };

function generic(info: string): { problem: RosterProblem } {
    return { problem: { kind: 'generic', info } };
}

/**
 * Whether a string is safe to name a document with. A document id taken from
 * client input has to be constrained or a `/` in it walks out of the
 * collection, so the shape is checked rather than escaped.
 */
export function isCreationKey(text: unknown): text is string {
    return (
        typeof text === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            text,
        )
    );
}

export function readRoster(
    students: unknown,
    method: unknown,
    affirmed: unknown,
): RosterReading {
    // Absent means a client from before this shipped, which only ever sent
    // passwords. Anything else is a client we don't understand.
    const signin = method === undefined ? 'password' : method;
    if (signin !== 'password' && signin !== 'email')
        return generic(`${JSON.stringify(method)} is not a way to sign in`);

    if (!Array.isArray(students))
        return generic(
            `expected a list of students but received a ${typeof students}`,
        );

    const read: RosterStudent[] = [];
    for (const entry of students) {
        if (typeof entry !== 'object' || entry === null)
            return generic('expected each student to be a record');
        const {
            username: typed,
            meta,
            email,
            password,
        } = entry as Record<string, unknown>;
        if (typeof typed !== 'string')
            return generic('expected each student to have a username');
        if (!Array.isArray(meta) || meta.some((m) => typeof m !== 'string'))
            return generic('expected each student to have a list of text');

        // A client from before #1347 sends the synthesized address as the
        // username, so unwrap one rather than refusing it: a tab left open
        // across a deploy still works.
        const username = usernameFromEmail(typed) ?? typed;
        if (!isValidUsername(username))
            return {
                problem: {
                    kind: 'account',
                    info: `The username ${username} cannot be claimed`,
                },
            };

        // Each student must carry exactly what the class's method implies and
        // nothing else. Carrying the other one is a client bug rather than a
        // teacher's mistake, and guessing which wins is how an account ends up
        // with a password nobody was told about.
        if (signin === 'email') {
            if (typeof email !== 'string' || email.trim() === '')
                return generic(`${username} has no email address`);
            const address = email.trim();
            if (!isMailableAddress(address))
                return generic(`${address} is not an email address`);
            if (typeof password === 'string' && password !== '')
                return generic(
                    `${username} was given a password in a class that signs in by email`,
                );
            read.push({
                username,
                address,
                password: undefined,
                meta: meta as string[],
            });
        } else {
            if (typeof email === 'string' && email.trim() !== '')
                return generic(
                    `${username} was given an email address in a class that signs in with passwords`,
                );
            if (
                typeof password !== 'string' ||
                password.length < MinimumPasswordLength
            )
                return generic(`${username} needs a password`);
            read.push({
                username,
                address: usernameEmail(username),
                password,
                meta: meta as string[],
            });
        }
    }

    // Two rows naming one person is the teacher's mistake, and saying so beats
    // what happens otherwise: both reach reserveUsername, and the second's
    // 'taken' reports the *class* as unavailable rather than the roster as
    // duplicated.
    const names = new Set<string>();
    const addresses = new Set<string>();
    for (const student of read) {
        const folded = foldUsername(student.username);
        if (names.has(folded))
            return {
                problem: {
                    kind: 'account',
                    info: `Two students were given the username ${student.username}`,
                },
            };
        names.add(folded);
        const address = student.address.toLowerCase();
        if (addresses.has(address))
            return {
                problem: {
                    kind: 'account',
                    info:
                        signin === 'email'
                            ? `Two students were given the address ${student.address}`
                            : `Two students were given the username ${student.username}`,
                },
            };
        addresses.add(address);
    }

    // Binding a real address to an account is what #628's age gate governs, so
    // the teacher has to say they may. Checked here as well as in the form,
    // because a form is only a suggestion to anyone willing to skip it.
    if (signin === 'email' && affirmed !== true)
        return {
            problem: {
                kind: 'affirmation',
                info: 'Creating accounts with student email addresses needs the teacher to affirm they may',
            },
        };

    return { method: signin, students: read };
}
