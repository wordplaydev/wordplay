import { firestore } from '@db/firebase';
import { Creator } from '@db/creators/CreatorDatabase';
import type { User } from 'firebase/auth';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

/**
 * The signed-in creator's username, as a module-level store — the same pattern
 * as [strikes](src/db/creators/strikes.svelte.ts) and
 * [notices](src/db/moderation/notices.svelte.ts), so the profile, the character
 * editor, and the share dialog share one copy without plumbing.
 *
 * Server-written and self-readable (see firestore.rules): a username is what a
 * `@username/Character` reference resolves against, so a creator who could
 * write it could take a name someone else's projects already point at.
 */

/** Where the server keeps them. */
export const HandleCollection = 'handles';

export type Handle = {
    username: string;
    /** Epoch ms after which this creator may attach an email address. Absent
     *  means already eligible — every account made before #628, and every class
     *  student, since a teacher created those. */
    emailEligibleOn?: number;
};

export const handle = $state<{ record: Handle | undefined }>({
    record: undefined,
});

/**
 * The signed-in creator's username.
 *
 * Falls back to the local part of their synthesized address, which is where a
 * username lived before handles existed. **That fallback is what makes "nothing
 * has to migrate" true** — every account created before #628 has no handle
 * document and never will, and still renders correctly.
 *
 * Undefined only while auth is resolving, or for an email account whose handle
 * hasn't arrived yet.
 */
export function getUsername(user: User | null): string | undefined {
    if (handle.record !== undefined) return handle.record.username;
    if (user === null) return undefined;
    const derived = Creator.getUsername(user.email ?? '');
    return derived === '' || derived === user.email ? undefined : derived;
}

/** Whether this creator may attach an email address yet. Absent means yes: the
 *  question only has an answer for accounts that were asked a birthday. */
export function mayUseEmail(now: number = Date.now()): boolean {
    const when = handle.record?.emailEligibleOn;
    return when === undefined || when <= now;
}

let unsubscribe: Unsubscribe | undefined = undefined;

/**
 * Watch the signed-in creator's handle, or stop watching on sign-out.
 *
 * A live listener rather than a one-time read because the handle can be written
 * *during* the session it matters in — joinAccount writes it moments after the
 * custom token signs someone in, and claimUsername writes it just before a
 * change of sign-in method.
 */
export function syncHandle(user: User | null): void {
    unsubscribe?.();
    unsubscribe = undefined;
    if (user === null || firestore === undefined) {
        handle.record = undefined;
        return;
    }
    unsubscribe = onSnapshot(
        doc(firestore, HandleCollection, user.uid),
        (snapshot) => {
            handle.record = snapshot.exists()
                ? toHandle(snapshot.data())
                : undefined;
        },
        // A read failure means we fall back to deriving the name from the
        // address, which is what every older account does anyway.
        () => undefined,
    );
}

/** Read defensively: written by a Cloud Function, so a deploy-time version skew
 *  must not throw inside the nav chip. */
function toHandle(data: unknown): Handle | undefined {
    if (typeof data !== 'object' || data === null) return undefined;
    const record: Record<string, unknown> = { ...data };
    if (typeof record.username !== 'string') return undefined;
    return {
        username: record.username,
        ...(typeof record.emailEligibleOn === 'number'
            ? { emailEligibleOn: record.emailEligibleOn }
            : {}),
    };
}
