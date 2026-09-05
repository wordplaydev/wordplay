import { getAuth } from 'firebase-admin/auth';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type {
    UsernameAvailableInputs,
    UsernameAvailableOutput,
} from 'shared-types';
import { usernamesAvailable } from './handles.js';
import { usernameEmail } from './username.js';

/**
 * Whether each name could be claimed (#628).
 *
 * Advisory: the transaction inside joinAccount is what actually decides, and
 * two people can still submit the same name in the same second. This is what
 * the join form and the class roster show while someone types.
 *
 * Unauthenticated by design — you have to know whether a name is free before
 * you have an account — but App Check enforced and capped per call, because it
 * is the one remaining way to ask a question about accounts in bulk. It answers
 * only about *usernames*, never addresses, which is the difference from the
 * emailExists callable it replaces.
 */

/** Enough for a class roster of 50 plus the retries credentials.ts makes when
 *  its generated names collide. */
const MaxNames = 60;

export default async function usernameAvailable(
    request: CallableRequest<UsernameAvailableInputs>,
): Promise<UsernameAvailableOutput> {
    const names = request.data?.usernames;
    if (!Array.isArray(names)) return {};
    const asked = names.filter((n) => typeof n === 'string').slice(0, MaxNames);
    if (asked.length === 0) return {};

    return usernamesAvailable(
        asked,
        async (email) => {
            const { users } = await getAuth().getUsers([{ email }]);
            return users.length > 0;
        },
        usernameEmail,
    );
}
