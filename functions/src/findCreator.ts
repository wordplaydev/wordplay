import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { FindCreatorInputs, FindCreatorOutput } from 'shared-types';
import { UsernameCollection, type Reservation } from './handles.js';
import { foldUsername, usernameEmail } from './username.js';

/**
 * Resolve an email address or username to a uid, for adding a collaborator
 * (#628).
 *
 * The only place an address may be looked up, and the reason getCreators can
 * stop accepting them. Requires a signed-in caller, because looking someone up
 * by address is something only a person already in a gallery or a class has any
 * reason to do — and answers a uid and nothing else, so it can never be used to
 * read back a name or an address.
 */
export default async function findCreator(
    request: CallableRequest<FindCreatorInputs>,
): Promise<FindCreatorOutput> {
    if (request.auth?.uid === undefined) return { uid: null };
    const typed = request.data?.emailOrUsername;
    if (typeof typed !== 'string' || typed.trim() === '') return { uid: null };
    const text = typed.trim();

    // A username first: it's the public identifier, and resolving it needs no
    // address at all.
    const reservation = (
        await getFirestore()
            .collection(UsernameCollection)
            .doc(foldUsername(text))
            .get()
    ).data() as Reservation | undefined;
    if (reservation?.uid != null) return { uid: reservation.uid };

    // Then the synthesized address, for accounts that predate handles, and
    // finally a real one.
    for (const email of [usernameEmail(text), text]) {
        const user = await getAuth()
            .getUserByEmail(email)
            .catch(() => undefined);
        if (user !== undefined) return { uid: user.uid };
    }
    return { uid: null };
}
