import { UsernameLength } from '@db/isValidUsername';
import NumberGenerator from 'recoverable-random';

export type Credentials = { username: string; password: string };
export type StudentWithCredentials = Credentials & { meta: string[] };

export function createCredentials(
    students: string[][],
    secrets: string[],
): Credentials[] {
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
        while (
            credentials.some((c) => c.username === username) ||
            username.length < UsernameLength
        ) {
            usernameCount++;
            username = originalUsername + usernameCount;
        }

        function randomWord() {
            return secrets[
                Math.min(
                    secrets.length - 1,
                    Math.max(
                        0,
                        Math.floor(random.random(0, secrets.length - 1)),
                    ),
                )
            ];
        }
        function randomPassword() {
            let pass = '';
            while (pass.length < 12) pass += randomWord();
            return pass;
        }

        let password = randomPassword();
        while (credentials.some((c) => c.password === password)) {
            password = randomPassword();
        }

        credentials.push({ username, password });
    }

    return credentials;
}
