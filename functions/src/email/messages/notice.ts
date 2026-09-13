import type { NoticeKind, SerializedNotice } from 'shared-types';
import { canonicalOrigin } from '../../origin.js';
import { noticeDestination } from '../../noticeLink.js';
import {
    emailSection,
    field,
    subsection,
    substitute,
    toPlainText,
} from '../copy.js';
import type { EmailMessage } from '../layout.js';

/**
 * A notice, as mail.
 *
 * The copy is the email's own, under `ui.email.notice`, rather than the
 * sentence the notification bell shows. They read as different things because
 * they are: a bell entry is a list item that embeds the thing's title and ends
 * without a period, which as a subject line is both too long and unpunctuated.
 * The bell keeps its wording untouched.
 *
 * Deliberately not carried into mail: the flag list on a decision. Those are
 * `[formatted]` markup whose faithful rendering would mean shipping the
 * Wordplay parser into `functions/`, and the link leads to the full notice.
 * The moderator's note *is* carried, because it is the part a creator most
 * needs and it goes only to them.
 */

/** Which short heading a kind gets. Grouped rather than one per kind: a heading
 *  says what sort of news this is, and several kinds are the same sort. */
const Headings: Record<NoticeKind, keyof typeof DefaultHeadings> = {
    reported: 'reported',
    decision: 'decision',
    outcome: 'decision',
    'review-requested': 'review',
    'review-pending': 'review',
    warning: 'warning',
    'gallery-listed': 'listing',
    'gallery-denied': 'listing',
    'kit-listed': 'listing',
    'kit-denied': 'listing',
    'howto-listed': 'listing',
    'howto-denied': 'listing',
    'howto-published': 'howto',
    'chat-message': 'chat',
    // Its own group, not `reported`: this says a report *you filed* arrived,
    // and "Your project was reported" would be about someone else's work.
    'report-received': 'received',
};

const DefaultHeadings = {
    reported: 'Reported',
    received: 'Report received',
    decision: 'Moderation decision',
    review: 'Waiting for review',
    warning: 'A warning',
    listing: 'Listing decision',
    howto: 'New how-to',
    chat: 'New chats',
};

/**
 * The subject line, and the sentence inside.
 *
 * Written for email rather than borrowed from the notification bell, which is
 * what made these verbose: a bell entry is a list item that embeds the thing's
 * title and ends without a period, and a subject line is neither. The subject
 * names the *kind* — your project, your how-to — because a mailbox truncates
 * and the kind is what tells you whether to open it.
 */
const DefaultSubjects: Record<keyof typeof DefaultHeadings, string> = {
    reported: 'Your $kind was reported',
    received: 'We got your report',
    decision: 'A decision about your $kind',
    review: 'Something is waiting for your review',
    warning: 'A warning about what you shared',
    listing: 'A decision about listing your $kind',
    howto: 'A new how-to in your gallery',
    chat: 'You have unread chats',
};

const DefaultBodies: Record<keyof typeof DefaultHeadings, string> = {
    reported:
        'Someone asked for a review of something you made in "$title". Whoever is responsible will take a look.',
    received:
        'Your report about "$title" reached whoever is responsible for reviewing it.',
    decision: 'A decision was made about something you made in "$title".',
    review: 'Someone asked for a review of "$title".',
    warning:
        'This is warning $#count[1|$count] about something you shared publicly.',
    listing: 'A decision was made about whether "$title" is listed.',
    howto: '"$title" was published in a gallery you are part of.',
    chat: 'There are messages you have not read.',
};

/** What each reportable kind is called, for the middle of a subject line. */
const DefaultKinds: Record<string, string> = {
    project: 'project',
    gallery: 'gallery',
    howto: 'how-to',
    character: 'character',
    kit: 'kit',
    chat: 'chat',
};

export type NoticeEmailCopy = {
    /** A few words saying what sort of news this is. */
    heading: string;
    /** The subject line. */
    subject: string;
    /** The sentence under the heading. */
    headline: string;
    /** The label before a moderator's note, when there is one. */
    noteLabel: string;
    /** The label on the button leading to the notice. */
    open: string;
    /** The footer link to where these can be turned off. */
    manage: string;
};

const DefaultNoteLabel = 'They said:';
const DefaultOpen = 'Take a look';
const DefaultManage = 'Change your notification settings';

export async function noticeCopy(
    notice: SerializedNotice,
    locale: string | undefined,
): Promise<NoticeEmailCopy> {
    const [shared, email, kinds] = await Promise.all([
        emailSection('ui.dialog.notifications.notification', locale),
        emailSection('ui.email.notice', locale),
        emailSection('moderation.subject', locale),
    ]);
    const language = locale?.split(/[-_]/)[0] ?? 'en';
    const group = Headings[notice.kind];

    // The kind is what a subject names — "your project", "your how-to" — since
    // a mailbox truncates and the title is inside anyway.
    const kind = field(
        kinds,
        notice.subject.kind,
        DefaultKinds[notice.subject.kind] ?? DefaultKinds.project ?? 'project',
    );
    const inputs = {
        kind,
        title: notice.title,
        name: notice.title,
        count: notice.count ?? 1,
    };
    const fill = (
        where: 'subject' | 'body',
        fallbacks: Record<string, string>,
    ) =>
        toPlainText(
            substitute(
                field(subsection(email, where), group, fallbacks[group] ?? ''),
                inputs,
                language,
            ),
        );

    return {
        heading: field(
            subsection(email, 'heading'),
            group,
            DefaultHeadings[group],
        ),
        subject: fill('subject', DefaultSubjects),
        headline: fill('body', DefaultBodies),
        noteLabel: field(shared, 'note', DefaultNoteLabel),
        open: field(email, 'open', DefaultOpen),
        manage: field(email, 'manage', DefaultManage),
    };
}

/** Where a notice leads, as a link a mail client can follow. */
export function noticeURL(
    notice: SerializedNotice,
    locale: string | undefined,
): string {
    const path = noticeDestination(notice);
    return `${canonicalOrigin()}${locale === undefined ? '' : `/${locale}`}${path}`;
}

export function noticeMessage(
    notice: SerializedNotice,
    copy: NoticeEmailCopy,
    locale: string | undefined,
): EmailMessage {
    const url = noticeURL(notice, locale);
    return {
        subject: copy.subject,
        language: locale,
        preheader: copy.headline,
        blocks: [
            // The heading says what sort of news this is, and the sentence
            // under it says which thing — a heading carrying the whole sentence
            // reads as shouting, and the app's headings are tilted, which a
            // long line makes worse.
            { kind: 'heading', text: copy.heading },
            { kind: 'paragraph', text: copy.headline },
            // Only ever on a notice to the author: a note may quote the
            // content, which a reporter must not see. `deliver` already
            // enforces that; carrying it here would leak it if it ever didn't.
            ...(notice.note === undefined
                ? []
                : ([
                      {
                          kind: 'field',
                          label: copy.noteLabel,
                          value: notice.note,
                      },
                  ] as const)),
            { kind: 'button', label: copy.open, url },
            { kind: 'url', url },
        ],
        manageURL: `${canonicalOrigin()}${locale === undefined ? '' : `/${locale}`}/profile`,
        manageLabel: copy.manage,
    };
}
