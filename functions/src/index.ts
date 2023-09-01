import functions from 'firebase-functions';
import admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import * as https from 'https';
import * as http from 'http';

initializeApp();

export const getUserIDsFromEmails = functions.https.onCall(
    async (data: {
        emails: string[];
    }): Promise<Record<string, string | null>> => {
        const emails = data.emails;
        const users = await admin.auth().getUsers(
            emails.map((email) => {
                return { email };
            })
        );
        const map: Record<string, string | null> = {};
        users.users.forEach((user) => {
            if (user.email) map[user.email] = user.uid ?? null;
        });
        return map;
    }
);

export const getEmailsFromUserIDs = functions.https.onCall(
    async (data: {
        uids: string[];
    }): Promise<Record<string, string | null>> => {
        const uids = data.uids;

        const users = await admin.auth().getUsers(
            uids.map((uid) => {
                return { uid };
            })
        );

        const map: Record<string, string | null> = {};
        users.users.forEach((user) => {
            if (user.email) map[user.uid] = user.email ?? null;
        });

        return map;
    }
);

/** Given a URL that should refer to an HTML document, sends a GET request to the URL to try to get the document's text. */
export const getWebpage = functions.https.onCall(
    async (data: { url: string }): Promise<string> => {
        const { url } = data;

        const lib = url.startsWith('https://')
            ? https
            : url.startsWith('http://')
            ? http
            : undefined;

        if (lib === undefined) {
            console.log('Invalid URL: ' + url);
            return 'invalid-url';
        }

        return await new Promise((resolve) => {
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
    }
);
