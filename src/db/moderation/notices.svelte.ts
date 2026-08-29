import { firestore } from '@db/firebase';
import type { User } from 'firebase/auth';
import {
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
    type Unsubscribe,
} from 'firebase/firestore';
import type { SerializedNotice, SerializedNotices } from 'shared-types';
import { NoticesCollection, noNotices, toNotices } from './Notice';

/**
 * The signed-in creator's inbox, as a module-level store so the bell and
 * anything else that needs it share one copy without plumbing. Same pattern as
 * [strikes](src/db/creators/strikes.svelte.ts) and
 * [translation budget](src/db/translationBudget.svelte.ts).
 *
 * `undefined` means "not known yet, or nothing to know" — a creator nobody has
 * ever written to has no document at all, which is the common case and must
 * render as nothing rather than as an empty state.
 */
export const notices = $state<{ record: SerializedNotices | undefined }>({
    record: undefined,
});

/** Everything the server has sent, newest first. */
export function written(): SerializedNotice[] {
    return [...(notices.record?.notices ?? [])].sort((a, b) => b.time - a.time);
}

/** Whether the reader has already dismissed this notice, written or derived. */
export function dismissed(id: string): boolean {
    return notices.record?.dismissed.includes(id) ?? false;
}

let unsubscribe: Unsubscribe | undefined = undefined;

/**
 * Watch the signed-in creator's inbox, or stop watching on sign-out.
 *
 * A live listener rather than a one-time read because a decision can land while
 * the app is open — and because that is the whole point of #938: someone is
 * waiting to hear what happened.
 */
export function syncNotices(user: User | null): void {
    unsubscribe?.();
    unsubscribe = undefined;
    if (user === null || firestore === undefined) {
        notices.record = undefined;
        return;
    }
    unsubscribe = onSnapshot(
        doc(firestore, NoticesCollection, user.uid),
        (snapshot) => {
            notices.record = snapshot.exists()
                ? toNotices(snapshot.data())
                : undefined;
        },
        // A read failure means we can't show news the app works fine without.
        () => undefined,
    );
}

/**
 * Remember that the reader has dismissed a notice.
 *
 * Dismissals cover derived notices too, which is what makes "clear" mean one
 * thing for every kind: a derived notice is re-synthesized on every load, so
 * without a stored dismissal it would come back forever — and a pushed one
 * vanished on reload whether or not it had been read. Both were true at once
 * before this, which is why the bell's "clear all" meant two different things.
 */
export async function dismiss(uid: string, ids: string[]): Promise<void> {
    if (firestore === undefined || ids.length === 0) return;
    const already = notices.record ?? noNotices();
    const merged = [...new Set([...already.dismissed, ...ids])];
    // Optimistic, so the bell empties immediately; the listener confirms.
    notices.record = { ...already, dismissed: merged };
    const ref = doc(firestore, NoticesCollection, uid);
    try {
        // The rules let the reader change only `dismissed` and `readAt`, so
        // this is an update rather than a set — a set would carry `notices` and
        // be refused, which is the point: the notices are the server's.
        await updateDoc(ref, { dismissed: merged });
    } catch {
        // No inbox yet: a creator can dismiss a derived notice before the
        // server has ever written them anything, so there is nowhere for the
        // dismissal to land. The rules allow creating an empty one for exactly
        // this.
        try {
            await setDoc(ref, { ...noNotices(), dismissed: merged });
        } catch {
            // Offline, or rules refused: the dismissal stays local for this
            // session rather than surfacing an error over a piece of news.
        }
    }
}
