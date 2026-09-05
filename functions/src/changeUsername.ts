import { getFirestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { ChangeUsernameInputs, ChangeUsernameOutput } from 'shared-types';
import {
    getHandle,
    HandleCollection,
    UsernameCollection,
    type Handle,
    type Reservation,
} from './handles.js';
import { foldUsername, isValidUsername } from './username.js';

/**
 * Change the signed-in creator's username (#628 follow-up).
 *
 * A username used to be immutable, because a character's name embeds it and
 * `@username/Character` is a language token. That was the right default and the
 * wrong permanent answer: it left twenty accounts with a name that cannot be
 * referenced and no way to fix it themselves, and it meant an account that
 * acquired a real address could never be given a name at all.
 *
 * Three things make renaming safe:
 *
 * - **The old name stays reserved to the same creator**, marked `supersededBy`
 *   rather than retired. So it still resolves to them, their old login still
 *   works, and nobody else can ever take it — which matters because re-issuing
 *   would silently re-point live references at a stranger.
 * - **The Firebase Auth email is untouched.** The handle is what every surface
 *   displays; the address is only what Auth signs in with. Leaving it alone is
 *   what keeps sign-in working with no alias lookup anywhere.
 * - **Characters carry their old full name as an alias**, so
 *   `@oldname/Character` keeps resolving in anyone's project, not only in the
 *   renamer's own.
 */

/** Firestore caps a batch at 500 writes; a creator with more characters than
 *  this is not a case worth complicating the code for, and the callable says so
 *  rather than silently renaming some of them. */
const MaxCharacters = 400;

export default async function changeUsername(
    request: CallableRequest<ChangeUsernameInputs>,
): Promise<ChangeUsernameOutput> {
    const uid = request.auth?.uid;
    if (uid === undefined) return { error: 'unauthenticated' };

    const { username } = request.data;
    if (typeof username !== 'string' || !isValidUsername(username))
        return { error: 'invalid' };

    const db = getFirestore();
    const folded = foldUsername(username);
    const previous = await getHandle(uid);

    // Renaming to what they already have is a no-op rather than an error: a
    // double submit should not report a collision with themselves.
    if (previous?.folded === folded) return { changed: true };

    try {
        const taken = await db.collection(UsernameCollection).doc(folded).get();
        if (taken.exists && (taken.data() as Reservation).uid !== uid)
            return { error: 'taken' };

        const now = Date.now();
        const batch = db.batch();

        batch.set(db.collection(UsernameCollection).doc(folded), {
            v: 1,
            uid,
            username,
            claimed: now,
        } satisfies Reservation);

        batch.set(db.collection(HandleCollection).doc(uid), {
            v: 1,
            username,
            folded,
            claimed: previous?.claimed ?? now,
            ...(previous?.emailEligibleOn === undefined
                ? {}
                : { emailEligibleOn: previous.emailEligibleOn }),
        } satisfies Handle);

        if (previous !== undefined) {
            // An alias, not a tombstone: same creator, still resolvable.
            batch.update(
                db.collection(UsernameCollection).doc(previous.folded),
                { supersededBy: folded },
            );
        }

        // Characters move with their owner, keeping their old full name as an
        // alias so references written by anyone still resolve.
        const characters = await db
            .collection('characters')
            .where('owner', '==', uid)
            .limit(MaxCharacters + 1)
            .get();
        if (characters.size > MaxCharacters) return { error: 'failed' };

        for (const doc of characters.docs) {
            const name = doc.get('name');
            if (typeof name !== 'string' || name === '') continue;
            const slash = name.indexOf('/');
            const bare = slash >= 0 ? name.slice(slash + 1) : name;
            // Nothing after the slash is a draft nobody can reference; leave it
            // for the editor to name.
            if (bare === '') continue;
            const aliases: string[] = Array.isArray(doc.get('aliases'))
                ? doc.get('aliases')
                : [];
            batch.update(doc.ref, {
                name: `${username}/${bare}`,
                aliases: aliases.includes(name) ? aliases : [...aliases, name],
            });
        }

        await batch.commit();
        return { changed: true };
    } catch (error) {
        console.error('Could not change a username', error);
        return { error: 'failed' };
    }
}
