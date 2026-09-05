import { getAuth, type UserIdentifier } from 'firebase-admin/auth';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { getHandles } from './handles.js';
import { usernameFromEmail } from './username.js';

export type UserMatch = {
    uid: string;
    email: string | null;
    name: string | null;
    /**
     * The creator's username (#628): their handle when they have one, and
     * otherwise the local part of their synthesized address, which is where a
     * username lived before handles existed.
     *
     * Null only for an email account made before handles, which cannot happen
     * — email sign-up did not exist — so in practice this is always a name.
     *
     * `email` is still returned alongside it for one release. Nothing reads it:
     * removing it is the point of #628, since this callable is unauthenticated
     * and an address it returns is public. But deploy.yml ships functions and
     * hosting together with no ordering guarantee, so the field has to outlive
     * the client that read it by exactly one release.
     */
    username: string | null;
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
        chunks.map((chunk) => getAuth().getUsers(chunk)),
    );

    const users = results.flatMap((result) => result.users);
    // One batched read for every handle, rather than one per creator: a gallery
    // page resolves a hundred of these at once.
    const handles = await getHandles(users.map((user) => user.uid));

    const matches: UserMatch[] = [];
    for (const user of users)
        matches.push({
            email: user.email ?? null,
            uid: user.uid,
            name: user.displayName ?? null,
            username:
                handles.get(user.uid)?.username ??
                usernameFromEmail(user.email ?? '') ??
                null,
        });
    return matches;
}
