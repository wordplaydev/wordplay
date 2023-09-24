import { httpsCallable } from 'firebase/functions';
import type { Database } from './Database';
import { functions } from './firebase';

export default class GalleryDatabase {
    /** The main database that manages this gallery database */
    readonly database: Database;

    /** A cache of user email addresses retrieved from Firesbase */
    private emailsByUserID = new Map<string, string>();
    private userIDsByEmails = new Map<string, string>();

    constructor(database: Database) {
        this.database = database;
    }

    async getEmailFromUserIDs(
        uids: string[]
    ): Promise<Map<string, string | null>> {
        // Create a new mapping.
        const emails = new Map<string, string | null>();

        // Populate it with any emails we already have.
        // Keep track of any uids we don't have.
        const unknown: string[] = [];
        for (const uid of uids) {
            const email = this.emailsByUserID.get(uid);
            if (email) emails.set(uid, email);
            else unknown.push(uid);
        }

        // If there are unknowns, ask the server for them.
        // No access to functions? Do nothing.
        if (unknown.length > 0 && functions) {
            const getUserEmails = httpsCallable<
                { uids: string[] },
                Record<string, string>
            >(functions, 'getEmailsFromUserIDs');

            const newEmails = await getUserEmails({
                uids: unknown,
            });
            for (const [uid, email] of Object.entries(newEmails.data)) {
                emails.set(uid, email);
            }
        }

        // Cache them
        for (const [uid, email] of emails) {
            if (email) {
                this.emailsByUserID.set(uid, email);
                this.userIDsByEmails.set(email, uid);
            }
        }

        return emails;
    }

    async getUserIDsFromEmails(
        emails: string[]
    ): Promise<Map<string, string | null>> {
        // Create a new mapping.
        const userIDs = new Map<string, string | null>();

        // Populate it with any emails we already have.
        // Keep track of any uids we don't have.
        const unknown: string[] = [];
        for (const email of emails) {
            const userID = this.userIDsByEmails.get(email);
            if (userID) userIDs.set(email, userID);
            else unknown.push(email);
        }

        // If there are unknowns, ask the server for them.
        // No access to functions? Do nothing.
        if (unknown.length > 0 && functions) {
            const getUserIDs = httpsCallable<
                { emails: string[] },
                Record<string, string>
            >(functions, 'getUserIDsFromEmails');

            const newUserIDs = await getUserIDs({
                emails: unknown,
            });
            for (const [email, uid] of Object.entries(newUserIDs.data)) {
                userIDs.set(email, uid);
            }
        }

        // Cache them
        for (const [email, uid] of userIDs) {
            if (uid) {
                this.emailsByUserID.set(uid, email);
                this.userIDsByEmails.set(email, uid);
            }
        }

        return userIDs;
    }

    async getUserIDFromEmail(email: string) {
        await this.getUserIDsFromEmails([email]);
        return this.userIDsByEmails.get(email);
    }

    getEmail(uid: string) {
        return this.emailsByUserID.get(uid);
    }
}
