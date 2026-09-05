import { getFirestore } from 'firebase-admin/firestore';
import { foldUsername, isValidUsername } from './username.js';

/**
 * A creator's username, and the index that makes it unique.
 *
 * Two collections, because the two questions run in opposite directions and
 * need opposite visibility:
 *
 * - `handles/{uid}` answers "what is this person called?" It is the record —
 *   what every creator chip, roster, and `@username/Character` prefix shows.
 *   Others must be able to learn it, so getCreators reads it with the Admin SDK.
 * - `usernames/{folded}` answers "is this name taken?" It is the index, and it
 *   exists because Firestore has no unique-column constraint: the only way to
 *   make "check, then claim" atomic is a document *named after the thing being
 *   claimed*, so a transaction's create either wins or fails. Readable by
 *   nobody, since a readable name-keyed index enumerates every account.
 *
 * Both are server-written; firestore.rules forbids every client write.
 */

export const HandleCollection = 'handles';
export const UsernameCollection = 'usernames';

export type Handle = {
    v: 1;
    /** As typed. What every surface displays. */
    username: string;
    /** foldUsername(username): the reservation's document id. Denormalized so
     *  retiring never has to re-derive a fold whose rule may since have moved. */
    folded: string;
    claimed: number;
    /** Epoch ms after which this creator may attach an email address, derived at
     *  join from a region and birthday that are never stored. Absent means
     *  already eligible — accounts made before this, and class students. */
    emailEligibleOn?: number;
};

export type Reservation = {
    v: 1;
    /** The holder, or null while an account is being created for it, or once
     *  it has been retired (which `retiredAt` distinguishes). */
    uid: string | null;
    username: string;
    claimed: number;
    /** Set when the holder's account went away. A retired name is never
     *  re-issued: `@username/Character` is a language token, and reissuing would
     *  silently re-point live references at a different person. */
    retiredAt?: number;
};

export type ClaimResult =
    | 'claimed'
    | 'taken'
    | 'invalid'
    /** The uid already has a different username. Usernames are immutable
     *  because character names embed them. */
    | 'held';

/**
 * Hold a name while an account is created for it.
 *
 * Creating an Auth user cannot happen inside a Firestore transaction, so the
 * name has to be held across a step the transaction can't cover. A reservation
 * with no uid is that hold: taken atomically, pointed at the new uid by
 * `assignUsername`, and deleted by `releaseReservation` if account creation
 * fails.
 *
 * Distinct from a tombstone, which also has a null uid but carries `retiredAt`.
 */
export async function reserveUsername(
    username: string,
): Promise<'reserved' | 'taken' | 'invalid'> {
    if (!isValidUsername(username)) return 'invalid';
    const db = getFirestore();
    const reservation = db
        .collection(UsernameCollection)
        .doc(foldUsername(username));
    return db.runTransaction(async (transaction) => {
        if ((await transaction.get(reservation)).exists) return 'taken';
        transaction.create(reservation, {
            v: 1,
            uid: null,
            username,
            claimed: Date.now(),
        } satisfies Reservation);
        return 'reserved';
    });
}

/** Point a held reservation at the account that now exists, and write its
 *  handle. Separate from reserveUsername because the uid does not exist yet
 *  when the name must be held. */
export async function assignUsername(
    uid: string,
    username: string,
    extra: { emailEligibleOn?: number } = {},
): Promise<void> {
    const db = getFirestore();
    const folded = foldUsername(username);
    const batch = db.batch();
    batch.set(
        db.collection(UsernameCollection).doc(folded),
        { uid },
        {
            merge: true,
        },
    );
    batch.set(db.collection(HandleCollection).doc(uid), {
        v: 1,
        username,
        folded,
        claimed: Date.now(),
        ...(extra.emailEligibleOn === undefined
            ? {}
            : { emailEligibleOn: extra.emailEligibleOn }),
    } satisfies Handle);
    await batch.commit();
}

/**
 * Give a held name back after account creation failed.
 *
 * Deletes rather than tombstones, and only while the reservation is still
 * pending: nothing was ever named this, so nobody's `@username/Character` can
 * point at it, and holding the name forever would punish a creator for our
 * failure. A reservation that has since been assigned or retired is left alone.
 */
export async function releaseReservation(username: string): Promise<void> {
    const db = getFirestore();
    const reservation = db
        .collection(UsernameCollection)
        .doc(foldUsername(username));
    await db
        .runTransaction(async (transaction) => {
            const stored = (await transaction.get(reservation)).data() as
                Reservation | undefined;
            if (stored === undefined) return;
            if (stored.uid !== null || stored.retiredAt !== undefined) return;
            transaction.delete(reservation);
        })
        .catch((error) => {
            console.error('Could not release a username reservation', error);
        });
}

/**
 * Reserve `username` for an account that already exists, and write its handle,
 * in one transaction. Used when the uid is known up front — an existing creator
 * recording their name before changing how they sign in.
 *
 * Idempotent for the same pair, so a retry after a dropped response doesn't
 * tell a creator their own name is taken.
 */
export async function claimUsername(
    uid: string,
    username: string,
    extra: { emailEligibleOn?: number } = {},
): Promise<ClaimResult> {
    if (!isValidUsername(username)) return 'invalid';
    const db = getFirestore();
    const folded = foldUsername(username);
    const reservation = db.collection(UsernameCollection).doc(folded);
    const handle = db.collection(HandleCollection).doc(uid);

    return db.runTransaction(async (transaction) => {
        const [existingName, existingHandle] = await transaction.getAll(
            reservation,
            handle,
        );
        const held = existingHandle.data() as Handle | undefined;
        if (held !== undefined && held.folded !== folded) return 'held';

        const taken = existingName.data() as Reservation | undefined;
        if (taken !== undefined && taken.uid !== uid) return 'taken';

        const now = Date.now();
        transaction.set(reservation, {
            v: 1,
            uid,
            username,
            claimed: taken?.claimed ?? now,
        } satisfies Reservation);
        transaction.set(handle, {
            v: 1,
            username,
            folded,
            claimed: held?.claimed ?? now,
            ...(extra.emailEligibleOn === undefined
                ? {}
                : { emailEligibleOn: extra.emailEligibleOn }),
        } satisfies Handle);
        return 'claimed';
    });
}

/**
 * Whether each name could be claimed right now. Advisory — the transaction in
 * claimUsername is what actually decides — but it is what the join form and the
 * class roster show while someone types.
 *
 * A retired name counts as unavailable, which is the point of the tombstone.
 */
export async function usernamesAvailable(
    names: string[],
    accountExists: (email: string) => Promise<boolean>,
    usernameEmail: (name: string) => string,
): Promise<Record<string, boolean>> {
    const db = getFirestore();
    const answer: Record<string, boolean> = {};
    const checkable = names.filter((name) => {
        if (!isValidUsername(name)) {
            answer[name] = false;
            return false;
        }
        return true;
    });
    if (checkable.length === 0) return answer;

    const reservations = await db.getAll(
        ...checkable.map((name) =>
            db.collection(UsernameCollection).doc(foldUsername(name)),
        ),
    );
    for (const [index, name] of checkable.entries()) {
        if (reservations[index]?.exists) {
            answer[name] = false;
            continue;
        }
        // Accounts that predate handles have no reservation, and their username
        // lives only in their synthesized email address. Without this check a
        // creator's existing name could be handed to someone else.
        answer[name] = !(await accountExists(usernameEmail(name)));
    }
    return answer;
}

/** A creator's handle, or undefined when they have none — which every account
 *  made before #628 does, and whose username is derived from their synthesized
 *  email instead. */
export async function getHandle(uid: string): Promise<Handle | undefined> {
    const snapshot = await getFirestore()
        .collection(HandleCollection)
        .doc(uid)
        .get();
    return snapshot.exists ? (snapshot.data() as Handle) : undefined;
}

/** Handles for several uids at once, in one read. */
export async function getHandles(uids: string[]): Promise<Map<string, Handle>> {
    const found = new Map<string, Handle>();
    if (uids.length === 0) return found;
    const db = getFirestore();
    const snapshots = await db.getAll(
        ...uids.map((uid) => db.collection(HandleCollection).doc(uid)),
    );
    for (const [index, snapshot] of snapshots.entries()) {
        const uid = uids[index];
        if (snapshot.exists && uid !== undefined)
            found.set(uid, snapshot.data() as Handle);
    }
    return found;
}

/**
 * Give up a name when its account goes away: the handle is deleted, and the
 * reservation is kept as a tombstone rather than freed.
 *
 * Retiring rather than releasing on purpose. Deleting an account deletes its
 * projects but not its characters, and `@username/Character` is a language
 * token that anyone's project may contain — so re-issuing the name would point
 * live references at a stranger's work. Losing a name forever is the cheaper
 * failure.
 */
export async function retireUsername(uid: string): Promise<void> {
    const db = getFirestore();
    const handle = await getHandle(uid);
    if (handle === undefined) return;
    const batch = db.batch();
    batch.delete(db.collection(HandleCollection).doc(uid));
    batch.update(db.collection(UsernameCollection).doc(handle.folded), {
        uid: null,
        retiredAt: Date.now(),
    });
    await batch.commit();
}
