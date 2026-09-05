import { getAuth } from 'firebase-admin/auth';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { SendSigninLinkInputs, SendSigninLinkOutput } from 'shared-types';
import { sendSigninEmail, signinLinkSettings } from './signinEmail.js';
import { allowSigninLink } from './signinThrottle.js';
import { UsernameEmailDomain } from './username.js';

/**
 * Email a sign-in link to an existing account (#628).
 *
 * Replaces the client's `sendSignInLinkToEmail`, so the mail is ours rather
 * than Firebase's default template — in the reader's language, and looking like
 * Wordplay.
 *
 * The answer is identical whether or not an account exists. The login page has
 * always tried to maintain that (it reveals the paste field either way), but it
 * was doing so with a matched pair of branches around an `emailExists` call
 * that any caller could make directly. Deciding here makes it true by
 * construction, which is what let emailExists be deleted.
 */

/** A floor on how long the call takes, so the found and not-found paths can't
 *  be told apart by timing. Sending mail is slower than not sending it, and a
 *  consistent answer that leaks through a stopwatch is not consistent. */
const MinimumDurationMs = 250;

export default async function sendSigninLink(
    request: CallableRequest<SendSigninLinkInputs>,
): Promise<SendSigninLinkOutput> {
    const started = Date.now();
    const { email, locale } = request.data;

    const settle = async (
        answer: SendSigninLinkOutput,
    ): Promise<SendSigninLinkOutput> => {
        const remaining = MinimumDurationMs - (Date.now() - started);
        if (remaining > 0)
            await new Promise((resolve) => setTimeout(resolve, remaining));
        return answer;
    };

    if (
        typeof email !== 'string' ||
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
        // A synthesized address is not a mailbox; asking to mail one is either
        // a mistake or someone probing for username accounts.
        email.endsWith(UsernameEmailDomain)
    )
        return settle({ sent: true });

    const pepper = process.env.THROTTLE_PEPPER ?? '';
    if (!(await allowSigninLink(email, request.rawRequest.ip, pepper)))
        return settle({ error: 'throttled' });

    try {
        const user = await getAuth()
            .getUserByEmail(email)
            .catch(() => undefined);
        if (user !== undefined) {
            const link = await getAuth().generateSignInWithEmailLink(
                email,
                signinLinkSettings(),
            );
            await sendSigninEmail(
                email,
                link,
                locale,
                process.env.RESEND_API_KEY ?? '',
            );
        }
    } catch (error) {
        // Logged, not returned: a failure that only happens for real accounts
        // would be an oracle of its own.
        console.error('Could not send a sign-in link', error);
    }
    return settle({ sent: true });
}
