import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type {
    ClaimName,
    ClaimSet,
    SetClaimsInputs,
    SetClaimsOutput,
} from 'shared-types';
import { hasClaim } from './claims.js';

const StrikesCollection = 'strikes';

/** The only names that may be written. An unbounded claim map would be a way to
 *  put arbitrary keys into somebody's token. Kept in step with the flag list in
 *  scripts/claims.js by claimFlagsSync.test.ts. */
export const WritableClaims: ClaimName[] = [
    'admin',
    'mod',
    'teacher',
    'banned',
];

/** Why a change was refused, or undefined if it may go ahead. */
export type Refusal =
    /** Losing your own superuser claim takes the page away mid-press. */
    | 'self-demotion'
    /** Banning also un-publishes and warns, and none of that happens here. */
    | 'ban'
    | 'unknown-claim';

/**
 * Whether an administrator may make this change, and what the claims become.
 *
 * Pure, and separate from the callable, so the rules it enforces can be tested
 * without an emulator — the same split `strikes.ts` uses for `withStrike`.
 */
export function nextClaims(
    current: { [key: string]: unknown } | undefined | null,
    changes: Partial<ClaimSet>,
    who: { caller: string; subject: string },
): { claims: Record<string, unknown>; refusal?: Refusal } {
    const names = Object.keys(changes) as ClaimName[];
    if (names.some((name) => !WritableClaims.includes(name)))
        return { claims: {}, refusal: 'unknown-claim' };

    // Refused rather than confirmed: a confirmation is a thing to click
    // through, and the remedy for an administrator who should not be one is
    // another administrator, or scripts/claims.js with a service key.
    // Deliberately not "the last administrator" — counting them needs a second
    // sweep and races a concurrent demotion, and this already makes a
    // platform with no administrator unreachable one press at a time.
    if (who.subject === who.caller && changes.admin === false)
        return { claims: {}, refusal: 'self-demotion' };

    // One path to a ban, and it is the moderation queue: a ban also takes down
    // what is already public and warns the creator, and neither happens here.
    if (changes.banned === true) return { claims: {}, refusal: 'ban' };

    // Spread what is already there: setCustomUserClaims replaces the whole
    // object, so writing one claim alone strips the rest — the same rule ban()
    // in moderate.ts follows. A claim being taken away is deleted rather than
    // written `false`, so a token carries only what someone actually holds.
    const claims: Record<string, unknown> = { ...(current ?? {}) };
    for (const name of names) {
        if (changes[name] === true) claims[name] = true;
        else delete claims[name];
    }
    return { claims };
}

/** What a claims object holds, as stored. */
export function storedClaims(
    claims: { [key: string]: unknown } | undefined | null,
): ClaimSet {
    return {
        admin: claims?.admin === true,
        mod: claims?.mod === true,
        teacher: claims?.teacher === true,
        banned: claims?.banned === true,
    };
}

/** Give someone a privilege, or take one away. */
export default async function setClaims(
    request: CallableRequest<SetClaimsInputs>,
): Promise<SetClaimsOutput> {
    const caller = request.auth?.uid;
    if (caller === undefined || !hasClaim(request.auth?.token, 'admin'))
        throw new HttpsError(
            'permission-denied',
            'Only an administrator may change a privilege.',
        );

    const { uid, claims: changes } = request.data;
    if (typeof uid !== 'string' || uid.length === 0)
        throw new HttpsError('invalid-argument', 'Expected a uid.');
    if (typeof changes !== 'object' || changes === null)
        throw new HttpsError('invalid-argument', 'Expected claims.');

    const auth = getAuth();
    const user = await auth.getUser(uid);
    const { claims, refusal } = nextClaims(user.customClaims, changes, {
        caller,
        subject: uid,
    });
    if (refusal === 'self-demotion')
        throw new HttpsError(
            'failed-precondition',
            'An administrator cannot take away their own privileges.',
        );
    if (refusal === 'ban')
        throw new HttpsError(
            'invalid-argument',
            'A ban is a moderation decision. Use the moderation queue.',
        );
    if (refusal === 'unknown-claim')
        throw new HttpsError('invalid-argument', 'No such privilege.');

    await auth.setCustomUserClaims(uid, claims);

    // Lifting a ban has to clear the record as well as the claim. The claim is
    // what firestore.rules enforces, but strikes/{uid} is what the client reads
    // (src/db/creators/strikes.svelte.ts) — so a claim-only lift would leave
    // the app still telling them they cannot publish, and leave `count` at
    // three, so the next decision re-bans them on the spot. The strike history
    // itself is untouched: a lift is a second chance, not an erasure of what
    // happened, and a moderator looking at this creator later should still see
    // it. `merge` rather than a transaction because all three fields are
    // unconditional, and it creates the document if the ban was set by hand
    // with scripts/claims.js and no record was ever written.
    if (changes.banned === false)
        await getFirestore()
            .collection(StrikesCollection)
            .doc(uid)
            .set({ banned: false, count: 0, bannedAt: null }, { merge: true });

    return { claims: storedClaims(claims) };
}
