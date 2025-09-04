import {
    usernameAccountExists,
    usernamesExist,
} from '@db/creators/accountExists';
import { Creator } from '@db/creators/CreatorDatabase';
import { UsernameLength } from '@db/creators/isValidUsername';
import NumberGenerator from 'recoverable-random';

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

    // Now that we have some proposed usernames and passwords, we need to make sure they are unique in Firebase Auth.
    // We do this in bulk to avoid hitting the server too much.
    const existsByEmail = await usernamesExist(
        credentials.map((c) => c.username),
    );
    if (existsByEmail === undefined) return undefined;
    // If the username already exists, we need to generate a new one.
    for (const [email, exists] of Object.entries(existsByEmail)) {
        if (exists) {
            // Get the username back from the email.
            const username = Creator.getUsername(email);
            let revisedUsername = username;
            // Keep adding a number to the end until we find a unique username.
            let usernameCount = 0;
            while (await usernameAccountExists(username)) {
                usernameCount++;
                revisedUsername = username + usernameCount;
            }
            // Update the usernmame.
            const index = credentials.findIndex((c) => c.username === username);
            if (index >= 0) credentials[index].username = revisedUsername;
        }
    }

    return credentials;
}
