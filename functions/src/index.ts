import { onRequest, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import * as https from 'https';
import * as http from 'http';
import { UserIdentifier } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { PromisePool } from '@supercharge/promise-pool';

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

export const emailExists = onCall<string>(async (request): Promise<boolean> => {
    return admin
        .auth()
        .getUserByEmail(request.data)
        .then(() => {
            return true;
        })
        .catch(() => {
            return false;
        });
});

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
