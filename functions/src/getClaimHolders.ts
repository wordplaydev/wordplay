import { getAuth } from 'firebase-admin/auth';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type {
    ClaimHolder,
    ClaimSet,
    GetClaimHoldersOutput,
} from 'shared-types';
import { hasClaim } from './claims.js';
import { getHandles } from './handles.js';
import { usernameFromEmail } from './username.js';

/** Admin Auth pages users at a thousand at a time. */
const PageSize = 1000;

/**
 * Everyone who holds a privilege.
 *
 * A `listUsers` sweep, because a custom claim is not a field any query can
 * reach — the same reason `platformModerators` in emailDigests.ts sweeps, and
 * the same reason that job runs only once a day. Here it runs per page load,
 * which this page can afford because only an administrator can ask and almost
 * nobody does. It is O(every account), so it has a ceiling: past roughly a
 * hundred thousand accounts the answer is an index document maintained by
 * `setClaims`, not a longer timeout.
 */
export default async function getClaimHolders(
    request: CallableRequest<void>,
): Promise<GetClaimHoldersOutput> {
    if (!hasClaim(request.auth?.token, 'admin'))
        throw new HttpsError(
            'permission-denied',
            'Only an administrator may see who holds a privilege.',
        );

    const auth = getAuth();
    const found: { uid: string; email: string | null; claims: ClaimSet }[] = [];
    let page: string | undefined;
    do {
        const result = await auth.listUsers(PageSize, page);
        for (const user of result.users) {
            // As stored, never as implied. The page this feeds is an editor:
            // showing an administrator's `mod` box already ticked would mean
            // unticking it appeared to do nothing.
            const stored = user.customClaims ?? {};
            const claims: ClaimSet = {
                admin: stored.admin === true,
                mod: stored.mod === true,
                teacher: stored.teacher === true,
                banned: stored.banned === true,
            };
            if (Object.values(claims).some((held) => held))
                found.push({
                    uid: user.uid,
                    email: user.email ?? null,
                    claims,
                });
        }
        page = result.pageToken;
    } while (page !== undefined);

    // One batched read for every handle rather than one per holder, the way
    // getCreators resolves a gallery page's worth of names.
    const handles = await getHandles(found.map((holder) => holder.uid));
    const holders: ClaimHolder[] = found.map((holder) => ({
        uid: holder.uid,
        username:
            handles.get(holder.uid)?.username ??
            usernameFromEmail(holder.email ?? '') ??
            null,
        email: holder.email,
        claims: holder.claims,
    }));
    return { holders };
}
