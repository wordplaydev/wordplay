import { getAuth } from 'firebase-admin/auth';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type {
    SwitchToPasswordInputs,
    SwitchToPasswordOutput,
} from 'shared-types';
import { getHandle } from './handles.js';
import { usernameEmail, usernameFromEmail } from './username.js';

/**
 * Switch an account from an emailed link to a username and password (#628).
 *
 * Runs here rather than on the client because the destination is the
 * synthesized `<username>@u.wordplay.dev` address: `verifyBeforeUpdateEmail`
 * would try to mail a verification link to a domain that receives no mail, and
 * the address needs no verification anyway — it is derived from a username this
 * creator already holds.
 *
 * The reverse direction is deliberately *not* here. Moving to a real address
 * has to prove the creator owns it, which is exactly what the client's
 * verifyBeforeUpdateEmail does; doing it server-side would let anyone claim any
 * address.
 *
 * Never log `request.data`: it carries a password.
 */

const MinimumPasswordLength = 6;

export default async function switchToPassword(
    request: CallableRequest<SwitchToPasswordInputs>,
): Promise<SwitchToPasswordOutput> {
    const uid = request.auth?.uid;
    if (uid === undefined) return { error: 'unauthenticated' };

    const { password } = request.data;
    if (typeof password !== 'string' || password.length < MinimumPasswordLength)
        return { error: 'password-invalid' };

    try {
        const user = await getAuth().getUser(uid);
        // Already a username account: nothing to move, and rewriting the
        // address would be a way to change a username, which is not allowed.
        if (usernameFromEmail(user.email ?? '') !== undefined)
            return { error: 'already-password' };

        // The handle is the only record of what this creator is called once
        // their address stops carrying it, which is why claiming one is a
        // precondition rather than something to do afterwards.
        const handle = await getHandle(uid);
        if (handle === undefined) return { error: 'no-username' };

        await getAuth().updateUser(uid, {
            email: usernameEmail(handle.username),
            emailVerified: false,
            password,
        });
        return { switched: true };
    } catch (error) {
        console.error('Could not switch an account to a password', error);
        return { error: 'failed' };
    }
}
