import { usernameAvailable, usernamesAvailable } from '@db/creators/usernames';
import { UsernameLength } from '@db/creators/username';
import NumberGenerator from '@util/random/NumberGenerator';

export type Credentials = { username: string; password: string };
export type StudentWithCredentials = Credentials & { meta: string[] };

export async function createCredentials(
    students: string[][],
    secrets: string[],
): Promise<Credentials[] | undefined> {
    const credentials: Credentials[] = [];

    // A recoverable random number generate that we use to create stable usernames and passwords during editing.
    const random = new NumberGenerator(Math.random());

    // Need enough secrets to generate distinct passwords, otherwise this hangs.
    if (secrets.length < 25) return credentials;

    // Go through each student and try to generate a unique username and password.
    for (const student of students) {
        // Put any numbers last
        let originalUsername = student
            .sort(
                (a, b) =>
                    (/[0-9]+/.test(a) ? 1 : 0) - (/[0-9]+/.test(b) ? 1 : 0),
            )
            .map((i) => i.trim().substring(0, 3))
            .join('')
            .toLowerCase();
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
        let revisedUsername = username;
        // Keep adding a number to the end until we find a free username.
        // Check the revised candidate, not the original — the original is
        // known to be taken, so testing it would loop forever.
        let usernameCount = 0;
        while ((await usernameAvailable(revisedUsername)) !== true) {
            usernameCount++;
            revisedUsername = username + usernameCount;
        }
        const index = credentials.findIndex((c) => c.username === username);
        if (index >= 0) credentials[index].username = revisedUsername;
    }

    return credentials;
}
