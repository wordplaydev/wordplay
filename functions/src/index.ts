import { onRequest, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import * as https from 'https';
import * as http from 'http';
import { UserIdentifier } from 'firebase-admin/auth';

initializeApp();

type UserMatch = { uid: string; email: string | null; name: string | null };

export const getCreators = onCall(
    async (request: { data: UserIdentifier[] }): Promise<UserMatch[]> => {
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
    }
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

            // Send the HTML back as text.
            response.json(result);
        }
    }
);
