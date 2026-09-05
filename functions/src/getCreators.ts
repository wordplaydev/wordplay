import { getAuth, type UserIdentifier } from 'firebase-admin/auth';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { getHandles } from './handles.js';
import { usernameFromEmail } from './username.js';

export type UserMatch = {
    uid: string;
    name: string | null;
    /**
     * The creator's username (#628): their handle when they have one, and
     * otherwise the local part of their synthesized address, which is where a
     * username lived before handles existed.
     *
     * Null only for an email account made before handles, which cannot happen
     * — email sign-up did not exist — so in practice this is always a name.
     *
     * There is deliberately no `email` field. This callable is unauthenticated,
     * because a gallery page has to name a project's owner to a visitor who
     * isn't signed in — so anything it returns is public. It used to return
     * addresses, and Creator.getUsername rendered them verbatim.
     */
    username: string | null;
};

/** Admin Auth's getUsers() accepts at most 100 identifiers per call, so chunk
 *  larger requests (e.g. a classroom gallery with >100 participants). */
const GET_USERS_LIMIT = 100;

export default async function getCreators(
    request: CallableRequest<UserIdentifier[]>,
): Promise<UserMatch[]> {
    // Uids only. Looking someone up by address goes through findCreator, which
    // requires a signed-in caller and answers a uid alone — so an address can
    // still find someone, but can never be used to read one back.
    const identifiers = request.data.filter(
        (id): id is { uid: string } =>
            typeof id === 'object' && id !== null && 'uid' in id,
    );
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
            uid: user.uid,
            name: user.displayName ?? null,
            username:
                handles.get(user.uid)?.username ??
                usernameFromEmail(user.email ?? '') ??
                null,
        });
    return matches;
}
