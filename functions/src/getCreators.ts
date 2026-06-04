import admin from 'firebase-admin';
import type { UserIdentifier } from 'firebase-admin/auth';
import type { CallableRequest } from 'firebase-functions/v2/https';

export type UserMatch = {
    uid: string;
    email: string | null;
    name: string | null;
};

/** Admin Auth's getUsers() accepts at most 100 identifiers per call, so chunk
 *  larger requests (e.g. a classroom gallery with >100 participants). */
const GET_USERS_LIMIT = 100;

export default async function getCreators(
    request: CallableRequest<UserIdentifier[]>,
): Promise<UserMatch[]> {
    const identifiers = request.data;
    const chunks: UserIdentifier[][] = [];
    for (let i = 0; i < identifiers.length; i += GET_USERS_LIMIT)
        chunks.push(identifiers.slice(i, i + GET_USERS_LIMIT));

    const results = await Promise.all(
        chunks.map((chunk) => admin.auth().getUsers(chunk)),
    );

    const matches: UserMatch[] = [];
    for (const result of results)
        for (const user of result.users)
            matches.push({
                email: user.email ?? null,
                uid: user.uid,
                name: user.displayName ?? null,
            });
    return matches;
}
