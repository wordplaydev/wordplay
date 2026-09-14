import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

/**
 * Refuse a callable to a proxy session (#1313).
 *
 * `firestore.rules` cannot do this job. A proxy holds a genuine ID token for
 * the creator it is looking at, so every callable sees an ordinary signed-in
 * request from them — and callables use the Admin SDK, which rules do not
 * govern at all. Three of them (`claimUsername`, `switchToPassword`,
 * `changeUsername`) can set a password on that account, which would make a
 * feature for *looking* at somebody's Wordplay into a way to take it.
 *
 * Applied at registration rather than inside each handler, so which calls a
 * proxy may make is one list in index.ts that a reviewer can read at a glance,
 * and so a handler cannot be reached by a path that forgot the check.
 * `proxyGuard.test.ts` fails if a callable that writes is registered unwrapped.
 *
 * Kept out of `claims.ts`, which must stay import-free: the client's
 * `claimsSync.test.ts` imports that file directly across the `functions/`
 * boundary, where `firebase-functions` does not resolve.
 */
export function noProxy<Inputs, Output>(
    handler: (request: CallableRequest<Inputs>) => Output,
): (request: CallableRequest<Inputs>) => Output {
    return (request: CallableRequest<Inputs>) => {
        if (isProxy(request)) {
            throw new HttpsError(
                'permission-denied',
                'This is a read-only session. Stop proxying to do this.',
            );
        }
        return handler(request);
    };
}

/** Whether this request comes from a proxy session. The claim rides the token
 *  minted by `startProxy` and is never written to an account, so it cannot
 *  outlive the session it was minted for. */
export function isProxy(request: { auth?: { token?: unknown } }): boolean {
    const token = request.auth?.token;
    return (
        typeof token === 'object' &&
        token !== null &&
        (token as { proxy?: unknown }).proxy === true
    );
}
