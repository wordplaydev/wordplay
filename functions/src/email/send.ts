import { From, ReplyTo } from './addresses.js';

/**
 * The one way mail leaves Wordplay.
 *
 * `sendEmails` is the primitive rather than `sendEmail` because fan-out is
 * ordinary here, not exceptional: reporting something notifies every curator of
 * a gallery, a decision notifies every reporter, and publishing a how-to
 * notifies a whole class. Resend's plan allows 2 requests a second, so sending
 * one at a time would put fifteen seconds inside a callable someone is waiting
 * on. Its batch endpoint takes 100 distinct emails per request instead.
 *
 * NOTHING OUTSIDE `functions/` MAY IMPORT THIS. It reaches `resend`, which the
 * root `npm ci` does not install, and anything a root script or test imports
 * joins `svelte-check`'s program along with its whole import cone.
 * `emailImports.test.ts` enforces it.
 */

export type OutgoingEmail = {
    to: string;
    subject: string;
    html: string;
    text: string;
    /** Set on optional mail, so a client can offer to unsubscribe. */
    unsubscribe: string | undefined;
};

/** Resend's documented ceiling for one batch request. */
const BatchSize = 100;

function headersFor(email: OutgoingEmail): Record<string, string> | undefined {
    return email.unsubscribe === undefined
        ? undefined
        : { 'List-Unsubscribe': `<mailto:${email.unsubscribe}>` };
}

/** Send one. A thin wrapper, so a caller with a single recipient reads simply. */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
    return sendEmails([email]);
}

/**
 * Send many. Returns whether everything went; a failure is logged and
 * swallowed, because no caller's answer may depend on whether mail worked.
 */
export async function sendEmails(emails: OutgoingEmail[]): Promise<boolean> {
    if (emails.length === 0) return true;

    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        // No key locally, and a test must never depend on outbound mail.
        for (const email of emails)
            console.log(
                [
                    '',
                    `┌─ [emulator] email to ${email.to}`,
                    `│  subject: ${email.subject}`,
                    ...email.text.split('\n').map((line) => `│  ${line}`),
                    '└─ (not sent)',
                    '',
                ].join('\n'),
            );
        return true;
    }

    const apiKey = process.env.RESEND_API_KEY ?? '';
    if (apiKey === '') {
        // Distinct from a send failure on purpose: this one means the function
        // did not declare `secrets: [resendKey]`, which deploys green and then
        // silently never sends.
        console.error(
            `No RESEND_API_KEY: ${emails.length} email(s) not sent. Does this function declare the secret?`,
        );
        return false;
    }

    try {
        // Loaded here rather than at module scope so this module can be
        // imported without the mail SDK present, and so the emulator path above
        // never touches it.
        const { Resend } = await import('resend');
        const resend = new Resend(apiKey);
        let sent = true;
        for (let start = 0; start < emails.length; start += BatchSize) {
            const chunk = emails.slice(start, start + BatchSize);
            const result = await resend.batch.send(
                chunk.map((email) => ({
                    from: From,
                    replyTo: ReplyTo,
                    to: email.to,
                    subject: email.subject,
                    html: email.html,
                    text: email.text,
                    ...(headersFor(email) === undefined
                        ? {}
                        : { headers: headersFor(email) }),
                })),
                // One unreachable address must not cost the other ninety-nine
                // their mail; failures come back per index instead.
                { batchValidation: 'permissive' },
            );
            if (result.error) {
                console.error('Could not send a batch of email', result.error);
                sent = false;
            }
        }
        return sent;
    } catch (error) {
        console.error('Could not send email', error);
        return false;
    }
}
