/**
 * Who Wordplay's mail comes from, in one place.
 *
 * These used to be constants inside the sign-in email, which made them
 * invisible to everything else — including to anyone auditing what we send.
 * `npm run emails` reads them from here.
 */

/** Verified in Resend as a subdomain, so its reputation is independent of the
 *  Workspace mail sent from wordplay.dev. Every Wordplay email uses it: Resend
 *  can only send from a verified domain, and `wordplay.dev` is not one. */
export const From =
    process.env.WORDPLAY_EMAIL_FROM ?? 'Wordplay <hi@mail.wordplay.dev>';

/** Replies go somewhere a person reads. A child who can't sign in will reply
 *  to this mail, and `no-reply@` would drop that on the floor. */
export const ReplyTo = process.env.WORDPLAY_EMAIL_REPLY_TO ?? 'hi@wordplay.dev';

/** Where feedback lands. The one address that is a destination, not a sender. */
export const FeedbackTo = process.env.WORDPLAY_FEEDBACK_TO ?? 'hi@wordplay.dev';

/** Offered as `List-Unsubscribe` on optional mail. A mailto needs no endpoint,
 *  and the visible way to choose is the profile page. */
export const UnsubscribeTo =
    process.env.WORDPLAY_EMAIL_UNSUBSCRIBE ?? 'hi@wordplay.dev';
