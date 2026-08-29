import type { Firestore } from 'firebase-admin/firestore';
import type { SerializedNotice } from 'shared-types';
import { MAX_NOTICES } from './shared/index.js';

const NoticesCollection = 'notices';

/**
 * Append a notice to each recipient's inbox, trimming to the cap.
 *
 * Shared by `report` and `moderate`, which both have to tell someone something
 * they cannot read for themselves: a reporter may never read `reports`, and a
 * curator learns there is something waiting the same way.
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
                    readAt: existing.exists ? (existing.get('readAt') ?? 0) : 0,
                },
                { merge: true },
            );
        });
    }
}
