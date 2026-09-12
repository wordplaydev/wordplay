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
 * - **Characters and kits carry their old full name as an alias**, so
 *   `@oldname/Character` and `↓ @oldname/kit` keep resolving in anyone's
 *   project, not only in the renamer's own.
 *
 * A rename changes a kit's `name`, so `kitEdited` takes an approved kit back to
 * pending. Its published *versions* are left alone: they are immutable, a borrow
 * resolves by kit id, and the name on one is a historical label.
 */

/** Firestore's cap on one batch. */
export const BatchLimit = 500;

/** What a rename spends before it touches anything owned: the reservation, the handle,
 *  and the superseded alias. */
export const MaxFixedWrites = 3;

/** The budget for owned documents, which is the rest of the batch. A creator with more
 *  than this is not a case worth complicating the code for, and the callable says so
 *  rather than silently renaming some of them. */
export const MaxOwned = BatchLimit - MaxFixedWrites;

/** Whether a rename would overflow the batch, counted **across** collections rather than
 *  per collection — everything goes into one batch, so a per-collection cap of this size
 *  would commit one nearly twice over the limit. */
export function tooManyOwned(sizes: number[]): boolean {
    return sizes.reduce((total, size) => total + size, 0) > MaxOwned;
}

/**
 * The collections whose documents are named `username/name` and are referenced
 * from other people's source, so a rename has to carry them.
 *
 * Exported so `changeUsername.test.ts` can assert what is in it: the failure this
 * guards against is silent and one-sided — a collection left out keeps the old
 * username in its `name` forever, and nothing anywhere reports it.
 */
export const RenamedCollections = ['characters', 'kits'] as const;

/**
 * What one owned document's `name` and `aliases` become under a new username.
 *
 * `undefined` for a document with nothing after the slash: that is a draft nobody
 * can reference, so there is no name to preserve and the editor will name it.
 */
export function renameOwned(
    name: unknown,
    username: string,
    aliases: unknown,
): { name: string; aliases: string[] } | undefined {
    if (typeof name !== 'string' || name === '') return undefined;
    const slash = name.indexOf('/');
    const bare = slash >= 0 ? name.slice(slash + 1) : name;
    if (bare === '') return undefined;
    const existing: string[] = Array.isArray(aliases)
        ? aliases.filter((a): a is string => typeof a === 'string')
        : [];
    return {
        name: `${username}/${bare}`,
        // The old full name keeps resolving, because it sits in other people's
        // source and rewriting that is not ours to do.
        aliases: existing.includes(name) ? existing : [...existing, name],
    };
}

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

        // Characters and kits move with their owner, keeping their old full name
        // as an alias so references written by anyone still resolve. Both are
        // owner-scoped `username/name` and both are named in other people's
        // source, so the rule has to be the same for each — a kit left behind
        // would keep its old username in `name` and every `↓ @old/kit` would go
        // on resolving to a document claiming to belong to a creator who no
        // longer exists (#8).
        const owned = await Promise.all(
            RenamedCollections.map((collection) =>
                db
                    .collection(collection)
                    .where('owner', '==', uid)
                    .limit(MaxOwned + 1)
                    .get(),
            ),
        );
        // Over the cap the whole rename fails rather than half-applying: a creator whose
        // kits kept the old name and whose characters did not is a worse state than the
        // one they started in.
        if (tooManyOwned(owned.map((one) => one.size)))
            return { error: 'failed' };

        for (const docs of owned)
            for (const doc of docs.docs) {
                const renamed = renameOwned(
                    doc.get('name'),
                    username,
                    doc.get('aliases'),
                );
                if (renamed !== undefined) batch.update(doc.ref, renamed);
            }

        await batch.commit();
        return { changed: true };
    } catch (error) {
        console.error('Could not change a username', error);
        return { error: 'failed' };
    }
}
