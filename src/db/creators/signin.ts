import { getFunctionsInstance } from '@db/firebase';
import type { SendSigninLinkInputs, SendSigninLinkOutput } from 'shared-types';

/**
 * Ask the server to email a sign-in link (#628).
 *
 * Replaces the client's `sendSignInLinkToEmail`, so the mail is ours — in the
 * reader's language and looking like Wordplay — rather than Firebase's default
 * template. The link itself is still a Firebase sign-in link, so nothing about
 * how signing in works changes.
 *
 * Answers the same thing whether or not the address has an account. That is the
 * whole point: the login page must never confirm whether someone is registered,
 * and deciding on the server makes that true by construction.
 */
export async function sendSigninLink(
    email: string,
    locale?: string,
): Promise<'sent' | 'throttled' | 'failed'> {
    const functions = await getFunctionsInstance();
    if (functions === undefined) return 'failed';
    const { httpsCallable } = await import('firebase/functions');
    const send = httpsCallable<SendSigninLinkInputs, SendSigninLinkOutput>(
        functions,
        'sendSigninLink',
    );
    try {
        const { data } = await send({
            email,
            ...(locale === undefined ? {} : { locale }),
        });
        return data.error === 'throttled' ? 'throttled' : 'sent';
    } catch (error) {
        console.error(error);
        return 'failed';
    }
}
