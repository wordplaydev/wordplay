import type { User } from 'firebase/auth';
import type { ClaimName, ClaimSet } from 'shared-types';

/**
 * Which privileges a set of custom claims carries.
 *
 * `admin` is the superuser: it implies `mod` and `teacher`, so one claim is
 * enough to run the place and nobody has to hold three. `banned` is the one
 * thing it does not imply — that is the loss of public sharing (#193), not a
 * privilege, and authority over other people is not immunity from a decision
 * about your own content. A banned administrator can still lift their own ban
 * from /admin, so nothing is unrecoverable.
 *
 * Lives here rather than in a module of its own because every page in the app
 * reaches this file already, and all five audited import graphs are at their
 * file ceiling (see src/util/importGraph.test.ts). Mirrored in
 * functions/src/claims.ts and in firestore.rules' isMod/isTeacher;
 * claimsSync.test.ts holds all three to one table.
 */
export function hasClaim(
    claims: { [key: string]: unknown } | undefined | null,
    claim: ClaimName,
): boolean {
    if (claims === undefined || claims === null) return false;
    if (claim !== 'banned' && claims.admin === true) return true;
    return claims[claim] === true;
}

/** An empty set, for someone who holds nothing. */
export function noClaims(): ClaimSet {
    return { admin: false, mod: false, teacher: false, banned: false };
}

/**
 * One forced ID-token refresh per page load, shared by everything that asks
 * about a privilege.
 *
 * A custom claim only reaches a session when its token is replaced, and the SDK
 * replaces it on its own at about fifty-five minutes — so without this, someone
 * granted a privilege while signed in is told they don't have it for the rest of
 * the hour. That is what `moderation.error.notmod` has always had to apologize
 * for ("you may need to log in again").
 *
 * Memoized rather than per-caller, because five surfaces ask on a single page
 * load (the home page's two links, the notification bell, the feedback
 * controls, and whichever gate the reader is behind) and one round trip answers
 * all of them. Deliberately not folded into the auth listener in Database:
 * publishing `$user` waits for nothing, so the app still paints immediately and
 * the claim-gated parts resolve a beat later.
 *
 * A failed refresh is not fatal — `getIdTokenResult` then answers from the token
 * already held, which is the old behavior.
 */
let refreshing: Promise<unknown> | undefined;
function freshToken(user: User): Promise<unknown> {
    return (refreshing ??= user.getIdToken(true).catch(() => undefined));
}

/** Forget the memo, so the next question refreshes again. Called when the
 *  signed-in creator changes: the next account's claims are not this one's. */
export function forgetTokenRefresh(): void {
    refreshing = undefined;
}

/**
 * Whether this creator carries a privilege, `admin` included.
 *
 * Always against a token refreshed at least once this page load, so a privilege
 * granted a minute ago is visible now rather than after the reader signs in
 * again.
 */
export async function holdsClaim(
    user: User,
    claim: ClaimName,
): Promise<boolean | undefined> {
    try {
        await freshToken(user);
        const result = await user.getIdTokenResult();
        return hasClaim(result.claims, claim);
    } catch {
        // Undefined is "we could not tell", which the pages that gate on this
        // show as an offline message rather than as a refusal.
        return undefined;
    }
}

/** Whether this creator's token carries a claim as *stored* — not as implied.
 *  Only the raw reading; everything that asks about a privilege wants
 *  `holdsClaim`, so that a superuser satisfies it. */
export default async function (
    user: User,
    claim: string,
): Promise<boolean | undefined> {
    try {
        const result = await user.getIdTokenResult();
        return claim in result.claims
            ? result.claims[claim] === true
            : undefined;
    } catch (err) {
        return undefined;
    }
}
