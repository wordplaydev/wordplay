import { createHash } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * How often our own mail sender may be aimed at one address, and how much one
 * caller may send in total (#628).
 *
 * Without this, `sendSigninLink` is a spam cannon anyone can point at anyone:
 * it takes an arbitrary address and sends mail to it. App Check attests that
 * the caller is a real Wordplay client, which stops a script — it does not stop
 * a browser.
 *
 * Keys are salted hashes, never the address or IP itself. This collection
 * exists to protect people from unwanted mail; it must not itself become a list
 * of who has asked for a link, and firestore.rules makes it readable by nobody.
 */

export const ThrottleCollection = 'signinThrottle';

/** Per address: enough to cope with a link landing in spam and trying again,
 *  far short of enough to bother someone with. */
const PerAddressHour = 3;
const PerAddressDay = 10;
/** Per caller: a classroom shares an IP, so this is deliberately loose. It
 *  bounds spraying many different addresses, which the per-address caps can't
 *  see. */
const PerIpHour = 30;

const Hour = 60 * 60 * 1000;
const Day = 24 * Hour;

export type ThrottleRecord = { v: 1; sent: number[] };

function key(kind: 'e' | 'i', value: string, pepper: string): string {
    return `${kind}:${createHash('sha256')
        .update(`${pepper}:${value}`)
        .digest('hex')}`;
}

/** Count entries inside a window, so a burst and a slow drip are told apart. */
function within(sent: number[], now: number, window: number): number {
    return sent.filter((at) => now - at < window).length;
}

/**
 * Record an attempt, or report that it is over a cap.
 *
 * Address and IP are checked in one transaction each rather than together: a
 * caller over their IP cap should not consume the address's allowance, so the
 * IP is checked first and the address is only recorded once the IP passes.
 */
export async function allowSigninLink(
    email: string,
    ip: string | undefined,
    pepper: string,
    now: number = Date.now(),
): Promise<boolean> {
    if (
        ip !== undefined &&
        !(await bump(key('i', ip, pepper), now, [[Hour, PerIpHour]]))
    )
        return false;
    return bump(key('e', email.trim().toLowerCase(), pepper), now, [
        [Hour, PerAddressHour],
        [Day, PerAddressDay],
    ]);
}

async function bump(
    id: string,
    now: number,
    caps: [window: number, limit: number][],
): Promise<boolean> {
    const document = getFirestore().collection(ThrottleCollection).doc(id);
    return getFirestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(document);
        const stored = snapshot.data() as ThrottleRecord | undefined;
        // Trimmed to a day on every write, so the array can't grow without
        // bound for an address someone keeps hammering.
        const sent = (stored?.sent ?? []).filter((at) => now - at < Day);
        for (const [window, limit] of caps)
            if (within(sent, now, window) >= limit) return false;
        transaction.set(document, {
            v: 1,
            sent: [...sent, now],
        } satisfies ThrottleRecord);
        return true;
    });
}
