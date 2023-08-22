import functions from 'firebase-functions';
import admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';

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
