import { FeedbackTo, From, ReplyTo } from './addresses.js';
import { renderEmail, type EmailMessage } from './layout.js';
import { chatDigest, reviewDigest } from './messages/digest.js';
import { feedbackMessage } from './messages/feedback.js';
import { DefaultCopy, signinMessage } from './messages/signin.js';
import { noticeCopy, noticeMessage } from './messages/notice.js';

/**
 * Every email Wordplay sends, with a sample of each.
 *
 * Documentary on purpose: it exists so `npm run emails` can render a contact
 * sheet and so a reviewer can see what we send without reading six modules.
 * It is deliberately not a dispatcher — what to send is decided where the thing
 * happens, and a registry shaped for a dispatch that does not exist would be a
 * design for a system nobody has built.
 *
 * MUST NOT reach `send.ts` or `notify.ts`. A root script imports this, which
 * pulls its whole import cone into `svelte-check`'s program, where `resend` and
 * `firebase-functions` do not resolve. `emailImports.test.ts` enforces it.
 */

export type EmailKind = {
    id: string;
    /** One line saying what it is, for the sheet. */
    what: string;
    /** What causes it to be sent. */
    trigger: string;
    /** Who receives it. */
    to: string;
    from: string;
    replyTo: string;
    /** Whether it is written in the reader's language. */
    localized: boolean;
    /** Whether a creator can turn it off, and where. */
    optional: string;
    sample: () => Promise<EmailMessage>;
};

const SampleLink =
    'https://wordplay.dev/login?oobCode=sample&mode=signIn&lang=en';

function notice(
    kind: 'reported' | 'decision' | 'howto-published',
    title: string,
    /** What the notice is about. It decides both the word in the subject line
     *  and where the link goes, so a sample that always said "project" would
     *  show a how-to notice pointing at a project. */
    subject: { kind: 'project' | 'howto'; id: string; gallery: string | null },
    note?: string,
) {
    return {
        id: `sample-${kind}`,
        kind,
        subject,
        title,
        time: 0,
        ...(note === undefined ? {} : { note }),
    };
}

export const Emails: EmailKind[] = [
    {
        id: 'signin',
        what: 'The link that signs someone in, or finishes joining.',
        trigger: 'the sendSigninLink or joinAccount callable',
        to: 'the person signing in',
        from: From,
        replyTo: ReplyTo,
        localized: true,
        optional: 'no — it was asked for seconds earlier',
        sample: async () => signinMessage(SampleLink, DefaultCopy, 'en-US'),
    },
    {
        id: 'feedback',
        what: 'What a creator said about Wordplay, sent to whoever reads hi@.',
        trigger: 'a document created in feedback/{id}',
        to: FeedbackTo,
        from: From,
        replyTo: ReplyTo,
        localized: false,
        optional: 'no — it goes to us, not to a creator',
        sample: async () =>
            feedbackMessage(
                {
                    title: 'The stage goes blank when I press play',
                    description:
                        'It worked yesterday. It happens on my school laptop but not at home.',
                    type: 'defect',
                    url: 'https://wordplay.dev/project/example',
                    browser: 'Firefox 140 on ChromeOS',
                },
                'sample-feedback-id',
            ),
    },
    {
        id: 'notice-reported',
        what: 'Something you made was reported and is being reviewed.',
        trigger: 'the report callable, through deliver()',
        to: 'whoever made it',
        from: From,
        replyTo: ReplyTo,
        localized: true,
        optional: 'yes — "decisions about you", on the profile page',
        sample: async () => {
            const which = notice('reported', 'My paint program', {
                kind: 'project',
                id: 'sample',
                gallery: null,
            });
            return noticeMessage(
                which,
                await noticeCopy(which, 'en-US'),
                'en-US',
            );
        },
    },
    {
        id: 'notice-decision',
        what: 'A decision about something you made, with the moderator’s note.',
        trigger: 'the moderate callable, through deliver()',
        to: 'whoever made it',
        from: From,
        replyTo: ReplyTo,
        localized: true,
        optional: 'yes — "decisions about you", on the profile page',
        sample: async () => {
            const which = notice(
                'decision',
                'My paint program',
                { kind: 'project', id: 'sample', gallery: null },
                'Please take out the picture on the third page.',
            );
            return noticeMessage(
                which,
                await noticeCopy(which, 'en-US'),
                'en-US',
            );
        },
    },
    {
        id: 'notice-howto-published',
        what: 'A how-to was published in a gallery you are in.',
        trigger: 'the howToEdited trigger, when published first becomes true',
        to: 'the gallery’s curators and creators',
        from: From,
        replyTo: ReplyTo,
        localized: true,
        optional: 'yes — "messages and new posts", off unless chosen',
        sample: async () => {
            const which = notice('howto-published', 'Drawing with shapes', {
                kind: 'howto',
                id: 'sample-howto',
                gallery: 'sample-gallery',
            });
            return noticeMessage(
                which,
                await noticeCopy(which, 'en-US'),
                'en-US',
            );
        },
    },
    {
        id: 'review-digest',
        what: 'How much is waiting in a reviewer’s queue.',
        trigger: 'a daily scheduled sweep',
        to: 'platform moderators and gallery curators',
        from: From,
        replyTo: ReplyTo,
        localized: true,
        optional: 'yes — "waiting for your review", on the profile page',
        sample: () => reviewDigest(3, 'en-US'),
    },
    {
        id: 'chat-digest',
        what: 'How many conversations have something unread in them.',
        trigger: 'a scheduled sweep every few hours',
        to: 'anyone who asked for it',
        from: From,
        replyTo: ReplyTo,
        localized: true,
        optional: 'yes — "messages and new posts", off unless chosen',
        sample: () => chatDigest(2, 'en-US'),
    },
];

/** One email, rendered, for the sheet. */
export async function renderSample(kind: EmailKind) {
    return renderEmail(await kind.sample());
}
