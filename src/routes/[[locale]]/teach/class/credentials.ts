import { UsernameLength } from '@db/creators/username';
import { usernameAvailable, usernamesAvailable } from '@db/creators/usernames';
import NumberGenerator from '@util/random/NumberGenerator';
import type { ClassSigninMethod } from 'shared-types';
import { addressOf, baseUsername, describingCells } from './roster';

export type Credentials = {
    username: string;
    /** Empty for a student who signs in by emailed link: they have no password
     *  at all, so there is nothing to print in that column. */
    password: string;
    /** The address they sign in with, in an email class. */
    email?: string | undefined;
};
export type StudentWithCredentials = Credentials & { meta: string[] };

/** How many numeric suffixes to try before giving up on a name. Bounded because
 *  the availability check answers `undefined` when it can't ask, and the loop
 *  used to read that as "keep going" — one request per turn, forever, against
 *  an unreachable server. */
const MaxSuffixes = 20;

export async function createCredentials(
    students: string[][],
    secrets: string[],
    method: ClassSigninMethod = 'password',
): Promise<Credentials[] | undefined> {
    const credentials: Credentials[] = [];

    // A recoverable random number generate that we use to create stable usernames and passwords during editing.
    const random = new NumberGenerator(Math.random());

    // Need enough secrets to generate distinct passwords, otherwise this hangs.
    // An email class needs no words at all, and asking for twenty-five of them
    // would block a form that has nothing to use them for.
    if (method === 'password' && secrets.length < 25) return undefined;

    // Go through each student and try to generate a unique username and password.
    for (const student of students) {
        const email = addressOf(student, method);

        let originalUsername = baseUsername(
            describingCells(student, method),
            email,
        );
        let username = originalUsername;
        let usernameCount = 0;

        // Keep searching for a user name that we haven't already chosen and is of sufficient length.
        while (
            credentials.some((c) => c.username === username) ||
            username.length < UsernameLength
        ) {
            usernameCount++;
            username = originalUsername + usernameCount;
        }

        // A student who signs in by emailed link has no password to generate.
        if (email !== undefined) {
            credentials.push({ username, password: '', email });
            continue;
        }

        function randomWord(current: string) {
            let pick = '';
            do {
                pick =
                    secrets[
                        Math.min(
                            secrets.length - 1,
                            Math.max(
                                0,
                                Math.floor(
                                    random.random(0, secrets.length - 1),
                                ),
                            ),
                        )
                    ];
            } while (current.includes(pick));
            return pick;
        }
        function randomPassword(current: string) {
            let pass = '';
            while (pass.length < 12) pass += randomWord(current);
            return pass;
        }

        let password = randomPassword('');
        while (credentials.some((c) => c.password === password)) {
            password = randomPassword(password);
        }

        // Add the credential we created.
        credentials.push({ username, password });
    }

    // Now that we have some proposed usernames and passwords, make sure each is
    // actually claimable. Asked in bulk to avoid hitting the server too much,
    // and about usernames rather than addresses — a reserved name is taken even
    // when no account holds it yet, which a lookup by address cannot see.
    const availability = await usernamesAvailable(
        credentials.map((c) => c.username),
    );
    if (availability === undefined) return undefined;
    for (const [username, available] of Object.entries(availability)) {
        if (available) continue;
        // Keep adding a number to the end until we find a free username.
        // Check the revised candidate, not the original — the original is
        // known to be taken, so testing it would loop forever. Only a definite
        // "yes" ends the search: `undefined` means we couldn't ask, and
        // treating that as "no" is what made this spin.
        let revisedUsername = username;
        let usernameCount = 0;
        let free: boolean | undefined = false;
        while (free !== true && usernameCount < MaxSuffixes) {
            usernameCount++;
            revisedUsername = username + usernameCount;
            free = await usernameAvailable(revisedUsername);
            if (free === undefined) return undefined;
        }
        if (free !== true) return undefined;
        const index = credentials.findIndex((c) => c.username === username);
        if (index >= 0) credentials[index].username = revisedUsername;
    }

    return credentials;
}
