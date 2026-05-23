import admin from 'firebase-admin';
import type { UserIdentifier } from 'firebase-admin/auth';
import type { CallableRequest } from 'firebase-functions/v2/https';

export type UserMatch = {
    uid: string;
    email: string | null;
    name: string | null;
};

export default async function getCreators(
    request: CallableRequest<UserIdentifier[]>,
): Promise<UserMatch[]> {
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
