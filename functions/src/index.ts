import { onRequest, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import * as https from 'https';
import * as http from 'http';
import { UserIdentifier } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { PromisePool } from '@supercharge/promise-pool';
import Translate from '@google-cloud/translate';
import {
    CreateClassInputs,
    CreateClassOutput,
    type EmailExistsInputs,
    type EmailExistsOutput,
} from './functions';

initializeApp();
const db = getFirestore();

type UserMatch = { uid: string; email: string | null; name: string | null };

export const getCreators = onCall<UserIdentifier[]>(
    async (request): Promise<UserMatch[]> => {
        const users = await admin.auth().getUsers(request.data);
        const matches: UserMatch[] = [];
        users.users.forEach((user) => {
            matches.push({
                email: user.email ?? null,
                uid: user.uid,
                name: user.displayName ?? null,
            });
        });
        return matches;
    },
);

/** Given a list of email addresses, return a map email => boolean indicating whether there is a corresponding account exists. Maximum of 100.*/
export const emailExists = onCall<
    EmailExistsInputs,
    Promise<EmailExistsOutput>
>(async (request) => {
    const emails = request.data;
    return admin
        .auth()
        .getUsers(
            emails.map((e) => {
                return { email: e };
            }),
        )
        .then(({ users }) => {
            const found: Record<string, boolean> = {};
            for (const email of emails)
                found[email] = users.some((u) => u.email === email);
            return found;
        })
        .catch(() => {
            return undefined;
        });
});

/**
 * Given a from to locale (using ll, where ll is a two character language code),
 * and a list of strings, use Google Cloud Translate to translate the list of strings into the target language.)
 */
export const getTranslations = onCall<{
    from: string;
    to: string;
    text: string[];
}>(
    // Permit local testing.
    { cors: ['/firebase.com$/', '/127.0.0.1*/', '/localhost*/'] },
    async (request): Promise<string[] | null> => {
        const from = request.data.from;
        const to = request.data.to;
        const text = request.data.text;

        try {
            // Creates a Google Translate client
            const translator = new Translate.v2.Translate();

            const [translations] = await translator.translate(text, {
                from,
                to,
            });

            return translations;
        } catch (e) {
            console.error(e);
            return null;
        }
    },
);

/** Given a URL that should refer to an HTML document, sends a GET request to the URL to try to get the document's text. */
export const getWebpage = onRequest(
    { cors: true },
    async (request, response) => {
        const url: string | undefined =
            'url' in request.query && typeof request.query.url === 'string'
                ? decodeURI(request.query['url'])
                : undefined;

        const lib =
            url === undefined
                ? undefined
                : url.startsWith('https://')
                  ? https
                  : http;

        // Cache the response for 10 minutes to minimize requests.
        response.set('Cache-Control', 'public, max-age=600, s-maxage=600');

        if (lib === undefined || url === undefined) {
            console.log('Invalid URL ' + url);
            response.json('invalid-url');
        } else {
            const result: string = await new Promise((resolve) => {
                lib.get(url, (resp) => {
                    const contentType = resp.headers['content-type'];
                    if (resp.statusCode !== 200) {
                        console.error(`GET status: Code: ${resp.statusCode}`);
                        resolve('not-available');
                    } else if (!contentType?.startsWith('text/html')) {
                        console.error(`GET received ${contentType}`);
                        resolve('not-html');
                    }

                    // Get the data
                    let data = '';

                    // A chunk of data has been recieved.
                    resp.on('data', (chunk) => {
                        data += chunk;
                    });

                    // The whole response has been received. Print out the result.
                    resp.on('end', () => {
                        console.log('GET success');
                        resolve(data);
                    });
                }).on('error', (err) => {
                    console.error('GET error: ' + err.message);
                    resolve('not-available');
                });
            });

            // Set the content length header.
            response.set('Content-Length', `${new Blob([result]).size}`);

            // Send the HTML back as JSON-encoded text.
            response.json(result);
        }
    },
);

const PurgeDayDelay = 30;
const MillisecondsPerDay = 24 * 60 * 60 * 1000;

/** Every day, delete projects that were archived more than 30 days ago. */
export const purgeArchivedProjects = onSchedule('every day 00:00', async () => {
    // Fetch all archived projects that were last modified more than 30 days ago
    const projectsRef = db.collection('projects');
    const purgeable = await projectsRef
        .where('archived', '==', true)
        .where(
            'timestamp',
            '<',
            Date.now() - PurgeDayDelay * MillisecondsPerDay,
        )
        .get();

    const projectIDs: string[] = [];
    purgeable.forEach((doc) => projectIDs.push(doc.id));

    // Don't delete all at once; we'll hit a request limit on large purges.
    await PromisePool.for(projectIDs)
        .withConcurrency(3)
        .process(async (id) => {
            projectsRef.doc(id).delete();
        });
});

/**
 * Given a teacher user ID, credential information for several students, and
 * a name and description for a class, create a class and return it's ID
 */
export const createClass = onCall<
    CreateClassInputs,
    Promise<CreateClassOutput>
>(async (request) => {
    const auth = admin.auth();
    const { teacher, name, description, students, existing } = request.data;

    // Make sure there aren't too many students.
    if (students.length > 50)
        return { classid: undefined, error: { kind: 'limit', info: '' } };

    // Ensure the teacher is a valid user ID.
    try {
        await auth.getUser(teacher);
    } catch (error) {
        console.error(JSON.stringify(error));
        return {
            classid: undefined,
            undefined,
            error: {
                kind: 'generic',
                info: "The teacher user id provided doesn't exist",
            },
        };
    }

    // Ensure each existing user is a valid user ID and get their usernames.
    const existingEmails: Map<string, string> = new Map();
    for (const uid of existing) {
        try {
            const user = await auth.getUser(uid);
            existingEmails.set(uid, user.email ?? '');
        } catch (error) {
            console.error(JSON.stringify(error));
            return {
                classid: undefined,
                error: {
                    kind: 'generic',
                    info: "One of the existing user ids provided doesn't exist",
                },
            };
        }
    }

    // Ensure the students are the correct type
    if (!Array.isArray(students)) {
        console.error('Received', JSON.stringify(students));
        return {
            classid: undefined,
            error: {
                kind: 'generic',
                info: `expected a list of students but received a ${typeof students}`,
            },
        };
    }

    const malformed = students.some(
        (s) =>
            typeof s.username !== 'string' ||
            typeof s.password !== 'string' ||
            !Array.isArray(s.meta),
    );
    if (malformed)
        return {
            classid: undefined,
            error: {
                kind: 'generic',
                info: `expected students in the list to have a username, password, and list of text, received ${JSON.stringify(malformed)}`,
            },
        };

    // Verify that none of the user accounts exist
    try {
        const result = await auth.getUsers(
            students.map((s) => {
                return { email: s.username };
            }),
        );
        // If any users exist, then we bail.
        if (result.users.length > 0)
            return {
                classid: undefined,
                error: {
                    kind: 'account',
                    info: 'One or more students already have accounts',
                },
            };
    } catch (err) {
        return {
            classid: undefined,
            error: {
                kind: 'generic',
                info: `Unable to check for existing users: ${JSON.stringify(err)}`,
            },
        };
    }

    // Okay, we're ready to create the user accounts!
    const users: { uid: string; username: string; meta: string[] }[] = [];
    for (const student of students) {
        try {
            const user = await auth.createUser({
                email: student.username,
                password: student.password,
            });
            users.push({
                uid: user.uid,
                username: student.username,
                meta: student.meta,
            });
        } catch (error) {
            return {
                classid: undefined,
                error: {
                    kind: 'generic',
                    info: `Unable to create user: ${JSON.stringify(error)}`,
                },
            };
        }
    }

    // Create the class
    const classRef = db.collection('classes').doc();
    await classRef.set({
        id: classRef.id,
        name,
        description,
        teachers: [teacher],
        learners: [...existing, ...users.map((u) => u.uid)],
        // Convert the email address back to a username
        info: [
            ...users.map((u) => {
                return { ...u, username: u.username.split('@')[0] };
            }),
            // Ensure there's a row for each existing student
            ...existing.map((uid) => {
                return {
                    uid,
                    username: existingEmails.get(uid) ?? '',
                    // Ensure the meta array is the same length as the new users
                    meta: users[0]?.meta.map(() => '') ?? [],
                };
            }),
        ],
        galleries: [],
    });

    return {
        classid: classRef.id,
        error: undefined,
    };
});
