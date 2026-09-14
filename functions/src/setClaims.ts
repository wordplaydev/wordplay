import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type { SetClaimsInputs, SetClaimsOutput } from 'shared-types';
import { hasClaim } from './claims.js';
import { nextClaims, storedClaims } from './claimChanges.js';

const StrikesCollection = 'strikes';

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
