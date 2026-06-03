import admin from 'firebase-admin';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { EmailExistsInputs, EmailExistsOutput } from 'shared-types';

// getUsers accepts <=100 identifiers per call and validates each email
// synchronously, throwing on the first malformed one (which bypasses a
// .then().catch()). Filter malformed emails out and query the rest in chunks.
const MAX_BATCH = 100;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function emailExists(
    request: CallableRequest<EmailExistsInputs>,
): Promise<EmailExistsOutput> {
    const emails = request.data;
    const found: Record<string, boolean> = {};

    const valid: string[] = [];
    for (const email of emails) {
        if (EMAIL_RE.test(email)) valid.push(email);
        else found[email] = false; // malformed → can't be an account
    }

    try {
        for (let i = 0; i < valid.length; i += MAX_BATCH) {
            const chunk = valid.slice(i, i + MAX_BATCH);
            const { users } = await admin
                .auth()
                .getUsers(chunk.map((email) => ({ email })));
            const existing = new Set(users.map((u) => u.email));
            for (const email of chunk) found[email] = existing.has(email);
        }
        return found;
    } catch {
        // Genuine lookup failure (network/permission): signal "unknown".
        return undefined;
    }
}
