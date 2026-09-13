import { emailSection, field } from '../copy.js';
import { renderEmail, type EmailMessage } from '../layout.js';

/**
 * The sign-in link email (#628), now rendered through the shared template.
 *
 * The caller passes a locale *code* and never any copy. A callable that took
 * text and mailed it to an arbitrary address would be a phishing relay.
 */

export type SigninCopy = {
    subject: string;
    heading: string;
    body: string;
    button: string;
    disclaimer: string;
};

/** What ships when the locale can't be fetched or hasn't been translated yet.
 *  Deliberately complete rather than a template: a half-filled email is worse
 *  than an English one. */
export const DefaultCopy: SigninCopy = {
    subject: 'Your Wordplay sign-in link',
    heading: 'Sign in to Wordplay',
    body: 'Select the button below to sign in. The link works once, and only for a little while.',
    button: 'Sign in',
    disclaimer:
        "If you didn't ask to sign in, you can ignore this email — nobody can get into your account without this link.",
};

export async function signinCopy(locale?: string): Promise<SigninCopy> {
    const section = await emailSection('ui.email.signin', locale);
    return {
        subject: field(section, 'subject', DefaultCopy.subject),
        heading: field(section, 'heading', DefaultCopy.heading),
        body: field(section, 'body', DefaultCopy.body),
        button: field(section, 'button', DefaultCopy.button),
        disclaimer: field(section, 'disclaimer', DefaultCopy.disclaimer),
    };
}

export function signinMessage(
    link: string,
    copy: SigninCopy,
    locale?: string,
): EmailMessage {
    return {
        subject: copy.subject,
        language: locale,
        preheader: copy.body,
        // The URL appears as a button and as text. The button is what most
        // people use; the plain URL is what makes the paste-the-link flow
        // possible when the mail is read on another device or in an installed
        // app, which opens links in a browser whose storage is a separate
        // container on iOS.
        blocks: [
            { kind: 'heading', text: copy.heading },
            { kind: 'paragraph', text: copy.body },
            { kind: 'button', label: copy.button, url: link },
            { kind: 'url', url: link },
            { kind: 'note', text: copy.disclaimer },
        ],
        manageURL: undefined,
        manageLabel: undefined,
    };
}

export function renderSigninEmail(
    link: string,
    copy: SigninCopy,
    locale?: string,
): { subject: string; html: string; text: string } {
    return renderEmail(signinMessage(link, copy, locale));
}
