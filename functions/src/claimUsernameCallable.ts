import type { CallableRequest } from 'firebase-functions/v2/https';
import type { ClaimUsernameInputs, ClaimUsernameOutput } from 'shared-types';
import { claimUsername } from './handles.js';

/**
 * Record a username for the signed-in creator (#628).
 *
 * Exists for the switch between sign-in methods. A username account's name
 * lives only in its synthesized `@u.wordplay.dev` address, so the moment that
 * address is replaced by a real one the name is gone — and with it every
 * `@username/Character` reference in anyone's project. This must therefore run
 * *before* the auth email changes, and the switch must refuse to proceed if it
 * did not land.
 *
 * Only ever claims for `request.auth.uid`: a uid parameter would let any signed
 * in caller name someone else.
 */
export default async function claimUsernameCallable(
    request: CallableRequest<ClaimUsernameInputs>,
): Promise<ClaimUsernameOutput> {
    const uid = request.auth?.uid;
    if (uid === undefined) return { error: 'unauthenticated' };
    const { username } = request.data;
    if (typeof username !== 'string') return { error: 'invalid' };

    const result = await claimUsername(uid, username).catch((error) => {
        console.error('Could not claim a username', error);
        return 'failed' as const;
    });
    return result === 'claimed' ? { claimed: true } : { error: result };
}
