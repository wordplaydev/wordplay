import { firestore } from '@db/firebase';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { Strikes } from 'shared-types';

/**
 * How many strikes it takes to lose the ability to make anything public (#193),
 * mirrored from `StrikesUntilBanned` in functions/src/strikes.ts.
 *
 * A display copy only — enforcement is the server's `banned` custom claim, and
 * this number just lets the app say "one more" before the record exists.
 * strikesSync.test.ts fails if the two drift.
 */
export const StrikesUntilBanned = 3;

/** Where the server keeps them. Client-readable, never client-writable. */
export const StrikesCollection = 'strikes';

/**
 * The signed-in creator's moderation record, as a module-level store so the
 * share dialog and the notification bell share one copy without plumbing. Same
 * pattern as [translation budget](src/db/translationBudget.svelte.ts) and
 * [notices](src/db/moderation/notices.svelte.ts).
 *
 * `undefined` means "not known yet or nothing to know" — a creator who has
 * never been found to break a rule has no document at all, which is the
 * overwhelmingly common case and must never render as anything.
 */
export const strikes = $state<{ record: Strikes | undefined }>({
    record: undefined,
});

/** Whether this creator has lost the ability to make anything public. */
export function isBanned(): boolean {
    return strikes.record?.banned ?? false;
}

/** How many more strikes before that happens. */
export function strikesRemaining(): number {
    return Math.max(0, StrikesUntilBanned - (strikes.record?.count ?? 0));
}

let unsubscribe: Unsubscribe | undefined = undefined;

/**
 * Watch the signed-in creator's record, or stop watching on sign-out.
 *
 * A live listener rather than a one-time read because a strike can land while
 * the app is open, and because the ban is enforced by a custom claim that the
 * open session's token doesn't have yet — seeing the record change is what
 * tells us to refresh the token (see below).
 */
export function syncStrikes(user: User | null): void {
    unsubscribe?.();
    unsubscribe = undefined;
    if (user === null || firestore === undefined) {
        strikes.record = undefined;
        return;
    }
    unsubscribe = onSnapshot(
        doc(firestore, StrikesCollection, user.uid),
        (snapshot) => {
            const data = snapshot.data();
            const wasBanned = strikes.record?.banned ?? false;
            strikes.record = snapshot.exists() ? toStrikes(data) : undefined;
            // Custom claims only reach a session when its ID token is
            // refreshed, which can otherwise take up to an hour. The record
            // changing is our signal that the claim has too, so ask for a
            // fresh token now — without it, a creator could keep publishing
            // for the rest of the session after being told they can't.
            if (!wasBanned && (strikes.record?.banned ?? false))
                void user.getIdToken(true);
        },
        // A read failure here is not worth surfacing: it means we can't
        // explain a restriction the rules will enforce regardless.
        () => undefined,
    );
}

/** Read a stored record defensively — it's written by a Cloud Function, so a
 *  version skew during a deploy shouldn't throw in the notification bell. */
function toStrikes(data: unknown): Strikes | undefined {
    if (typeof data !== 'object' || data === null) return undefined;
    const record: Record<string, unknown> = { ...data };
    if (typeof record.count !== 'number') return undefined;
    return {
        v: 1,
        count: record.count,
        strikes: Array.isArray(record.strikes) ? record.strikes : [],
        banned: record.banned === true,
        bannedAt: typeof record.bannedAt === 'number' ? record.bannedAt : null,
        // A curator's decisions about this creator (#938). Absent on records
        // written before curators could decide anything, and never counted —
        // only `count` decides whether public sharing is lost.
        ...(Array.isArray(record.findings)
            ? { findings: record.findings }
            : {}),
    };
}
