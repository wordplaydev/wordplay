import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * A record of one attempt to create a class, so a retry is answered rather than
 * re-run (#1347).
 *
 * `createClass` mints up to fifty accounts and then writes a class document. If
 * the response is dropped on the way back — a closed laptop, a flaky network —
 * the teacher sees a failure, and every retry fails again on the usernames
 * their own first attempt took. There is no way out of that from the form, and
 * no way to tell whether the class was made.
 *
 * The fix is a document named after the attempt. Firestore's `create` either
 * wins or fails, so it is the only primitive here that can decide a race, and
 * the class document and this record are written in one batch so "the class
 * exists" and "the record says so" cannot disagree.
 */

export const ClassCreationCollection = 'classCreations';

/** How long an attempt may be in flight before a retry stops waiting for it.
 *  Generously longer than minting fifty accounts, which takes seconds. */
export const InFlightGraceMs = 5 * 60 * 1000;

/** How long a finished record is kept before the reservation sweep tidies it.
 *  Long enough that a retry days later still answers, short enough that the
 *  collection is not a permanent log of every class ever made. */
export const RecordKeptMs = 7 * 24 * 60 * 60 * 1000;

export type ClassCreationStudent = { username: string; existed: boolean };

export type ClassCreation = {
    v: 1;
    teacher: string;
    started: number;
    /** Written with the class document, in the same batch. Present means the
     *  attempt finished, and this is the answer every later retry gets. */
    classid?: string;
    students?: ClassCreationStudent[];
};

export type ClaimResult =
    /** This call owns the attempt and should go ahead. */
    | { kind: 'claimed' }
    /** An earlier call already finished it; answer with this. */
    | { kind: 'done'; classid: string; students: ClassCreationStudent[] }
    /** An earlier call is still running, or died without cleaning up. */
    | { kind: 'inflight' };

export function creationRef(db: Firestore, key: string) {
    return db.collection(ClassCreationCollection).doc(key);
}

/**
 * Take ownership of an attempt, or report what became of it.
 *
 * Called after every validation and before the first reservation, so a roster
 * the teacher still has to fix leaves no record and an edited retry is a fresh
 * attempt rather than an in-flight one.
 *
 * A claim by a different teacher answers `inflight` rather than `done`: a
 * guessed key must not read back somebody else's class id.
 */
/**
 * What to do about an attempt, given whatever is already recorded for it.
 *
 * Pure, the way `reservationAction` is: the decision is the whole of this, and
 * asserting it through a Firestore double would be asserting the double. It
 * also keeps `vi.mock` out of functions/src, where nothing catches a mock
 * leaking into the next test file sharing the worker.
 */
export function claimAction(
    stored: ClassCreation | undefined,
    teacher: string,
    now: number,
): ClaimResult {
    if (stored === undefined) return { kind: 'claimed' };
    // A guessed key must not read back somebody else's class id.
    if (stored.teacher !== teacher) return { kind: 'inflight' };
    if (stored.classid !== undefined)
        return {
            kind: 'done',
            classid: stored.classid,
            students: stored.students ?? [],
        };
    // Still running: say so, rather than minting a second set of accounts for a
    // class that is about to exist.
    if (now - stored.started < InFlightGraceMs) return { kind: 'inflight' };
    // Past the grace with no class id, the earlier run died. Hand the attempt
    // to this one: if it died before creating anything the retry simply works,
    // and if it died after, the usernames it took are reported by name — a
    // better answer than waiting for a run that will never finish.
    return { kind: 'claimed' };
}

export async function claimCreation(
    key: string,
    teacher: string,
    now: number = Date.now(),
): Promise<ClaimResult> {
    const db = getFirestore();
    const ref = creationRef(db, key);
    return db.runTransaction<ClaimResult>(async (transaction) => {
        const stored = (await transaction.get(ref)).data() as
            ClassCreation | undefined;
        const action = claimAction(stored, teacher, now);
        // `set` rather than `create`, since a claim also takes over the record
        // of an attempt that died.
        if (action.kind === 'claimed')
            transaction.set(ref, {
                v: 1,
                teacher,
                started: now,
            } satisfies ClassCreation);
        return action;
    });
}
