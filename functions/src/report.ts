import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type {
    ReportInputs,
    ReportOutput,
    ReportSubjectKind,
} from 'shared-types';
import { forgetMessageTranslations } from './chatTranslations.js';
import getResponsibility from './responsibility.js';
import reportId from './reportId.js';
import deliver from './notices.js';
import describeSubject, { curatorsOf } from './subject.js';

const Reports = 'reports';
const Chats = 'chats';

/**
 * Ask whoever is responsible to review something (#938).
 *
 * A callable rather than a client write for three reasons, each of which the
 * old `addDoc` in ReportButton got wrong. Who may review a report is derived
 * from visibility, and a reporter naming their own reviewers is the same
 * mistake as a creator clearing their own strikes. A report has to be
 * deduplicated by a deterministic id, which a rule can't enforce. And only the
 * server can be trusted to read a subject the reporter can see but the report's
 * reviewers may not.
 */
export default async function report(
    request: CallableRequest<ReportInputs>,
): Promise<ReportOutput> {
    const uid = request.auth?.uid;
    if (uid === undefined)
        throw new HttpsError(
            'unauthenticated',
            // The same reasoning as #193's report button: an anonymous report
            // is unaccountable and un-rate-limitable.
            'Reporting requires an account.',
        );

    const { kind, subject, message } = request.data;
    if (!isKind(kind))
        throw new HttpsError('invalid-argument', 'Expected a subject kind.');
    if (typeof subject !== 'string' || subject.length === 0)
        throw new HttpsError('invalid-argument', 'Expected a subject id.');
    if (
        kind === 'chat' &&
        (typeof message !== 'string' || message.length === 0)
    )
        throw new HttpsError(
            'invalid-argument',
            'Expected the id of the message being reported.',
        );

    const db = getFirestore();
    const found = await describeSubject(db, kind, subject, message);
    if (found === undefined)
        throw new HttpsError('not-found', 'No such thing.');

    // Nobody reviews what nobody else can see, so there is nothing to ask for.
    const responsibility = getResponsibility(found.visibility);
    if (responsibility.kind === 'none')
        throw new HttpsError(
            'failed-precondition',
            'Nothing here is shared widely enough to be reviewed.',
        );

    if (!found.visibleTo(uid))
        throw new HttpsError(
            'permission-denied',
            'You can only report something you can see.',
        );
    if (found.author === uid)
        throw new HttpsError(
            'failed-precondition',
            'You cannot report your own content.',
        );

    // Curators of the responsible gallery, read now rather than joined in a
    // rule: see SerializedReport.moderators.
    const moderators =
        responsibility.kind === 'curators' || responsibility.kind === 'both'
            ? await curatorsOf(db, responsibility.gallery)
            : [];
    const platform =
        responsibility.kind === 'platform' || responsibility.kind === 'both';

    const now = Date.now();
    const ref = db.collection(Reports).doc(reportId(kind, subject, message));

    // A reported message is hidden while it waits, which is what the report
    // dialog has always promised. Making that true means moving the text out of
    // the chat, not hiding it behind an `{#if}`: every participant can read the
    // document, so text left in it is only hidden from people who don't look.
    //
    // Bounded, though, or a report becomes a way to silence anyone: the
    // takedown is spent once per message. A message already kept can be
    // reported again — someone may reasonably disagree — but that reopens the
    // review with the text still visible.
    let hidden: string | undefined;
    if (kind === 'chat' && message !== undefined) {
        const spent = (await ref.get()).get('kept') === true;
        if (!spent) {
            hidden = await hideMessage(db, subject, message);
            // The cached translations are copies of the words just taken out
            // of the chat, so they go too. Unconditional on `hidden` coming
            // back a string: an earlier delete may have nulled the text while
            // leaving a translation of it behind.
            await forgetMessageTranslations(db, subject, message);
        }
    }
    // In a transaction because two people can report the same thing at once,
    // and the second must join the first's request rather than replace it.
    const reporters = await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(ref);
        const already: string[] = existing.exists
            ? (existing.get('reporters') ?? [])
            : [];
        const joined = already.includes(uid) ? already : [...already, uid];
        transaction.set(
            ref,
            {
                v: 2,
                kind,
                subject,
                ...(message === undefined ? {} : { message }),
                gallery: found.visibility.gallery,
                // Refreshed on every report: a curator added since the first
                // one should still see it. `galleryEdited` does the same when a
                // gallery's curators change.
                moderators,
                platform,
                author: found.author,
                reporters: joined,
                ...(hidden === undefined ? {} : { text: hidden }),
                // Epoch milliseconds, like every other time in this codebase and
                // like the v1 reports this generalizes — the queue orders by it,
                // and a Timestamp would sort against numbers. Written once: this
                // is when the review was first asked for, not most recently.
                time: existing.exists ? existing.get('time') : now,
                // A new report on something already decided reopens it.
                resolved: false,
            },
            { merge: true },
        );
        return joined.length;
    });

    // Tell the people who cannot read the report itself: whoever has to review
    // it, whoever wrote the thing, and the person who asked. Keyed on the
    // report, so reporting the same thing twice doesn't say it all again.
    const where = {
        kind,
        id: subject,
        gallery: found.visibility.gallery,
        ...(message === undefined ? {} : { message }),
    };
    const key = reportId(kind, subject, message);
    await deliver(db, [
        ...moderators
            .filter((who) => who !== uid)
            .map((who) => ({
                to: who,
                notice: {
                    id: `review-${key}`,
                    kind: 'review-requested' as const,
                    subject: where,
                    title: found.title,
                    time: now,
                },
            })),
        ...(found.author === null
            ? []
            : [
                  {
                      to: found.author,
                      notice: {
                          id: `reported-${key}`,
                          kind: 'reported' as const,
                          subject: where,
                          title: found.title,
                          time: now,
                      },
                  },
              ]),
        {
            to: uid,
            notice: {
                id: `received-${key}`,
                kind: 'report-received' as const,
                subject: where,
                title: found.title,
                time: now,
            },
        },
    ]);

    return { reporters, responsibility };
}

function isKind(kind: unknown): kind is ReportSubjectKind {
    return (
        kind === 'project' ||
        kind === 'gallery' ||
        kind === 'howto' ||
        kind === 'chat'
    );
}

/**
 * Move a message's text onto its report and null it in the chat.
 *
 * Returns what was taken, so the report can hold it — and so a decision to keep
 * the message can put it back. Whoever is responsible reads it from the report,
 * which means a platform moderator can review a message in a private gallery
 * without being given read access to the conversation around it.
 */
async function hideMessage(
    db: FirebaseFirestore.Firestore,
    chatID: string,
    messageID: string,
): Promise<string | undefined> {
    return db.runTransaction(async (transaction) => {
        const ref = db.collection(Chats).doc(chatID);
        const chat = await transaction.get(ref);
        if (!chat.exists) return undefined;
        const messages = chat.get('messages') ?? [];
        const found = messages.find((m: { id?: string }) => m.id === messageID);
        const text: string | null | undefined = found?.text;
        transaction.update(ref, {
            messages: messages.map((m: { id?: string; text?: unknown }) =>
                m.id === messageID ? { ...m, text: null } : m,
            ),
            [`moderation.${messageID}`]: 'pending',
        });
        return typeof text === 'string' ? text : undefined;
    });
}
