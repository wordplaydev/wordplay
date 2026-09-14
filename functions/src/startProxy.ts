import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type { StartProxyInputs, StartProxyOutput } from 'shared-types';
import { hasClaim } from './claims.js';
import { getHandles } from './handles.js';
import { usernameFromEmail } from './username.js';

const ProxiesCollection = 'proxies';

/** How long a proxy session may look. An hour is what a custom token is good
 *  for anyway, and long enough to reproduce something without becoming a second
 *  way to be permanently signed in as somebody else. */
export const ProxyMinutes = 60;

/**
 * Look at Wordplay as another creator, read-only (#1313).
 *
 * Someone reporting that their projects won't load can only be helped by
 * seeing what they see, and asking them to narrate it is what this replaces.
 *
 * The session it starts can read everything that creator can and write nothing:
 * the token carries `proxy: true`, which `firestore.rules` refuses every write
 * on, and the client suppresses the writes that merely looking would otherwise
 * cause. It is deliberately not the "act as them" version this issue also
 * described — a session that can act is indistinguishable from the creator
 * themselves, in their project history and to everyone they collaborate with.
 */
export default async function startProxy(
    request: CallableRequest<StartProxyInputs>,
): Promise<StartProxyOutput> {
    const caller = request.auth?.uid;
    if (caller === undefined || !hasClaim(request.auth?.token, 'admin'))
        throw new HttpsError(
            'permission-denied',
            'Only an administrator may look at Wordplay as someone else.',
        );

    // An administrator proxying themselves would get a session strictly worse
    // than the one they have, and the banner would say something absurd.
    const { uid } = request.data;
    if (typeof uid !== 'string' || uid.length === 0)
        throw new HttpsError('invalid-argument', 'Expected a uid.');
    if (uid === caller)
        throw new HttpsError(
            'failed-precondition',
            'You are already yourself.',
        );

    // Fails if there is no such account, which is the check that matters: the
    // uid arrives from the client.
    const user = await getAuth().getUser(uid);
    const until = Date.now() + ProxyMinutes * 60_000;

    // Recorded before the token is minted, not after. This is the one call in
    // the app that can open anybody's account, so the trail has to exist even
    // if what follows fails. Server-written and administrator-readable, the
    // same shape as strikes/{uid}.
    await getFirestore()
        .collection(ProxiesCollection)
        .add({ v: 1, by: caller, uid, at: Date.now(), until });

    // `proxy` rides the token, never the account: a developer claim is minted
    // into this one session, so it cannot follow the creator to their own
    // logins. Their own claims still apply — proxying a moderator shows you a
    // moderator's Wordplay, which is the point.
    const token = await getAuth().createCustomToken(uid, {
        proxy: true,
        proxyUntil: until,
    });

    const handles = await getHandles([uid]);
    return {
        token,
        username:
            handles.get(uid)?.username ??
            usernameFromEmail(user.email ?? '') ??
            null,
        until,
    };
}
