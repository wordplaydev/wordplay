import type { Firestore } from 'firebase-admin/firestore';
import type { SerializedNotice } from 'shared-types';
import { noticeCopy, noticeMessage } from './email/messages/notice.js';
import { notifyByEmail } from './email/notify.js';
import { MAX_NOTICES, NoticeEmailGroups } from './shared/index.js';

const NoticesCollection = 'notices';

/**
 * Append a notice to each recipient's inbox, trimming to the cap, and mail it
 * to anyone who wants to hear.
 *
 * Shared by `report` and `moderate`, which both have to tell someone something
 * they cannot read for themselves: a reporter may never read `reports`, and a
 * curator learns there is something waiting the same way.
 *
 * Mail goes only for notices that were actually appended, and only after the
 * transactions commit — so a retry cannot write twice, and a mail failure
 * cannot roll back an inbox.
 */
export default async function deliver(
    db: Firestore,
    deliveries: { to: string; notice: SerializedNotice }[],
): Promise<void> {
    // Grouped, because two notices for one person must not overwrite each
    // other: an inbox is one document.
    const byRecipient = new Map<string, SerializedNotice[]>();
    for (const { to, notice } of deliveries)
        byRecipient.set(to, [...(byRecipient.get(to) ?? []), notice]);

    /** What each person was actually newly told, which is what to mail. */
    const delivered = new Map<string, SerializedNotice[]>();

    for (const [to, added] of byRecipient) {
        const ref = db.collection(NoticesCollection).doc(to);
        await db.runTransaction(async (transaction) => {
            const existing = await transaction.get(ref);
            const already: SerializedNotice[] = existing.exists
                ? (existing.get('notices') ?? [])
                : [];
            // Idempotent on the notice's own id, so a retried decision doesn't
            // tell someone the same thing twice.
            const fresh = added.filter(
                (notice) => !already.some((past) => past.id === notice.id),
            );
            if (fresh.length === 0) return;
            delivered.set(to, fresh);
            transaction.set(
                ref,
                {
                    v: 1,
                    // Oldest fall off the front: an inbox is a list of recent
                    // events, not an archive, and a document has a size limit.
                    notices: [...already, ...fresh].slice(-MAX_NOTICES),
                    dismissed: existing.exists
                        ? (existing.get('dismissed') ?? [])
                        : [],
                },
                { merge: true },
            );
        });
    }

    await mail(delivered);
}

/**
 * Mail what was just delivered, one batch per group.
 *
 * Grouped by preference rather than sent per notice, because a decision and its
 * outcome reach different people and only the preference decides who hears.
 * Failures are swallowed inside `notifyByEmail`: nobody's report or decision
 * may fail because mail did.
 */
async function mail(delivered: Map<string, SerializedNotice[]>): Promise<void> {
    // One notice per person per send: telling someone two things at once is a
    // digest, and these are each worth their own subject line.
    const byNotice = new Map<
        string,
        { uids: string[]; notice: SerializedNotice }
    >();
    for (const [uid, notices] of delivered)
        for (const notice of notices) {
            const existing = byNotice.get(notice.id);
            if (existing === undefined)
                byNotice.set(notice.id, { uids: [uid], notice });
            else existing.uids.push(uid);
        }

    for (const { uids, notice } of byNotice.values())
        await notifyByEmail(uids, NoticeEmailGroups[notice.kind], async (who) =>
            noticeMessage(
                notice,
                await noticeCopy(notice, who.locale),
                who.locale,
            ),
        );
}

/**
 * Mail a notice nobody wrote down.
 *
 * Most derived kinds — a listing decision, a warning, a how-to appearing in a
 * gallery — are computed by the client from documents it can already read, so
 * no inbox document ever exists to hang mail off. The server still knows the
 * moment they happen, which is the only moment worth writing about, so this
 * sends without delivering. The reader still sees the notice in the bell,
 * derived as before.
 */
export async function emailNotice(
    uids: string[],
    notice: SerializedNotice,
): Promise<number> {
    return notifyByEmail(uids, NoticeEmailGroups[notice.kind], async (who) =>
        noticeMessage(notice, await noticeCopy(notice, who.locale), who.locale),
    );
}
