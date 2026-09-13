import { withoutAnnotations as strip } from './email/copy.js';
import {
    DefaultCopy as SigninDefaultCopy,
    renderSigninEmail as render,
    signinCopy as copyFor,
    type SigninCopy,
} from './email/messages/signin.js';
import { sendEmail } from './email/send.js';
import { canonicalOrigin } from './origin.js';

/**
 * The sign-in link email (#628).
 *
 * Sent by us rather than by Firebase Auth's built-in sender, so the mail can be
 * in the reader's language and look like Wordplay. The link itself still comes
 * from `generateSignInWithEmailLink`, so nothing about how sign-in works
 * changes — only who puts it in an envelope.
 *
 * The copy, the rendering, and the sending now live in `email/`, shared with
 * every other message. This file stays the surface its two callers know.
 */

export type { SigninCopy };
export const DefaultCopy = SigninDefaultCopy;
export const withoutAnnotations = strip;
export const signinCopy = copyFor;
export const renderSigninEmail = render;

/** Where the emailed link lands. `handleCodeInApp` is required for a sign-in
 *  link, and /login is where the client's isSignInWithEmailLink check runs. */
export function signinLinkSettings(): {
    url: string;
    handleCodeInApp: true;
} {
    return { url: `${canonicalOrigin()}/login`, handleCodeInApp: true };
}

/** Send the link. Returns whether it went; a failure is logged and swallowed,
 *  because the caller must answer identically whether or not an account exists. */
export async function sendSigninEmail(
    email: string,
    link: string,
    locale: string | undefined,
): Promise<boolean> {
    const copy = await signinCopy(locale);
    const { subject, html, text } = renderSigninEmail(link, copy, locale);

    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        // The link is printed rather than sent so the sign-in flow can be
        // followed by hand: paste it into the browser, or into the login page's
        // own paste field. Safe only under the emulator — this is a working
        // credential, and it must never be logged in production, where Cloud
        // Logging would keep it. The Auth emulator has also recorded it at
        // /emulator/v1/projects/<project>/oobCodes, which is where
        // tests/end2end/login.spec.ts and join.spec.ts read it from.
        console.log(
            [
                '',
                `┌─ [emulator] sign-in link for ${email}`,
                `│  subject: ${subject}`,
                `│`,
                `│  ${link}`,
                '└─ (not sent; open it, or paste it into the login page)',
                '',
            ].join('\n'),
        );
        return true;
    }

    return sendEmail({
        to: email,
        subject,
        html,
        text,
        // Transactional: someone asked for this link seconds ago.
        unsubscribe: undefined,
    });
}
