import type {
    FirestoreEvent,
    QueryDocumentSnapshot,
} from 'firebase-functions/v2/firestore';
import { FeedbackTo } from './email/addresses.js';
import { renderFeedbackEmail } from './email/messages/feedback.js';
import { sendEmail } from './email/send.js';

/**
 * Mails new feedback to whoever reads `hi@`.
 *
 * Was nodemailer over Gmail SMTP with a password in `functions/.env`, which was
 * a second way to send mail for no reason once #628 brought Resend in. It also
 * built its HTML by interpolation, and anyone signed in can create a feedback
 * document — so the maintainer's inbox was taking unescaped creator text. The
 * shared template escapes every block.
 */
export default async function postFeedback(
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, { id: string }>,
): Promise<unknown> {
    const feedback = event.data?.data();
    if (feedback === undefined) return;
    if (feedback.title === undefined || feedback.description === undefined)
        return;

    const { subject, html, text } = renderFeedbackEmail(
        feedback,
        event.params.id,
    );

    return sendEmail({
        to: FeedbackTo,
        subject,
        html,
        text,
        // Not optional mail: there is no preference that turns it off.
        unsubscribe: undefined,
    });
}
