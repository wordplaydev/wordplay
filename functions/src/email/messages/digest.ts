import { canonicalOrigin } from '../../origin.js';
import { emailSection, field, substitute } from '../copy.js';
import type { EmailMessage } from '../layout.js';

/**
 * The two summaries.
 *
 * A summary rather than one mail per thing, for two different reasons. Review
 * work arrives in waves — a burst of reports, or a queue that has been sitting
 * — and forty separate emails is how a notification feature earns its
 * reputation. Chat has the opposite problem: `unread` is per conversation and
 * is cleared the moment the reader opens it, so "you have unread messages" is
 * the only honest thing that can be said about it anyway.
 */

const DefaultReview = {
    subject:
        '$#count[Something is|$count things are] waiting for you to review',
    heading: '$#count[1 thing|$count things] to review',
    body: 'Reports and listing requests wait in the moderation queue until someone decides about them.',
    open: 'Start reviewing',
};

const DefaultChat = {
    subject: 'You have unread chats',
    heading: 'New chats',
    body: 'There are messages you have not read in $#count[a chat|$count chats].',
    open: 'Read them',
};

const DefaultManage = 'Change your notification settings';

async function digest(
    section: string,
    fallback: { subject: string; heading: string; body: string; open: string },
    path: string,
    count: number,
    locale: string | undefined,
): Promise<EmailMessage> {
    const [copy, notice] = await Promise.all([
        emailSection(section, locale),
        emailSection('ui.email.notice', locale),
    ]);
    const language = locale?.split(/[-_]/)[0] ?? 'en';
    const prefix = `${canonicalOrigin()}${locale === undefined ? '' : `/${locale}`}`;
    const fill = (name: keyof typeof fallback) =>
        substitute(field(copy, name, fallback[name]), { count }, language);

    const url = `${prefix}${path}`;
    return {
        subject: fill('subject'),
        language: locale,
        preheader: fill('heading'),
        blocks: [
            // A few words, then the sentence that explains them. A heading
            // carrying the whole sentence is too long for a tilted line.
            { kind: 'heading', text: fill('heading') },
            { kind: 'paragraph', text: fill('body') },
            { kind: 'button', label: fill('open'), url },
            { kind: 'url', url },
        ],
        manageURL: `${prefix}/profile`,
        manageLabel: field(notice, 'manage', DefaultManage),
    };
}

/** What is waiting in a reviewer's queue. */
export function reviewDigest(
    count: number,
    locale: string | undefined,
): Promise<EmailMessage> {
    return digest('ui.email.review', DefaultReview, '/moderate', count, locale);
}

/** How many chats have something unread in them. */
export function chatDigest(
    count: number,
    locale: string | undefined,
): Promise<EmailMessage> {
    return digest('ui.email.chat', DefaultChat, '/projects', count, locale);
}
