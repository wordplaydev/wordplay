import admin from 'firebase-admin';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { EmailExistsInputs, EmailExistsOutput } from 'shared-types';

export default async function emailExists(
    request: CallableRequest<EmailExistsInputs>,
): Promise<EmailExistsOutput> {
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
}
