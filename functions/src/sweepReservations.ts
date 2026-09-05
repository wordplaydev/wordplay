import { PromisePool } from '@supercharge/promise-pool';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
    HandleCollection,
    UsernameCollection,
    type Reservation,
} from './handles.js';

/**
 * Tidy username reservations whose accounts are gone, and holds that were never
 * completed (#628).
 *
 * Two things leave a reservation behind, and neither is a bug that can be
 * designed away:
 *
 * - `Database.deleteAccount` deletes the creator document, then the auth user,
 *   and its own docstring already admits the window between them. If the
 *   process ends in that window the name is held by a uid that no longer
 *   resolves, and nobody can ever claim it again.
 * - `joinAccount` holds a name across `createUser`, which cannot be inside the
 *   Firestore transaction. It releases the hold when creation fails, but a
 *   function killed mid-flight releases nothing.
 *
 * The two get opposite treatment, which is the whole point of the pass:
 *
 * - A **pending** hold (no uid, no tombstone) older than the grace period is
 *   *deleted*. Nothing was ever named this, so no `@username/Character`
 *   reference can point at it, and holding it forever would punish a creator
 *   for our own crash.
 * - A hold whose **uid no longer resolves** is *retired*, not freed. Deleting an
 *   account deletes its projects but not its characters, and a re-issued name
 *   would silently re-point live references in anyone's project at a stranger's
 *   work. Losing a name forever is the cheaper failure.
 */

/** How long a hold may sit before it is assumed abandoned. Generously longer
 *  than any account creation, so a slow one is never swept out from under. */
const PendingGraceMs = 60 * 60 * 1000;

/** Cap each run so a large backlog can't load everything into one invocation;
 *  successive ticks drain the rest, exactly as purgeArchivedProjects does. */
const SweepPerRun = 300;

export type SweepReport = { released: number; retired: number; kept: number };

/**
 * What to do with one reservation, before anything is looked up.
 *
 * `check` means "this claims a uid, so go and see whether that account still
 * exists" — the only branch that needs a round trip, and the only one that can
 * end in a tombstone.
 */
export function reservationAction(
    held: Reservation,
    now: number,
): 'keep' | 'release' | 'check' {
    // Already a tombstone: nothing to decide, and never re-issued.
    if (held.retiredAt !== undefined) return 'keep';
    if (held.uid !== null) return 'check';
    // A hold with no uid is an account creation in flight. Give it long enough
    // that a slow one is never swept out from under, then assume it died.
    return now - held.claimed < PendingGraceMs ? 'keep' : 'release';
}

export default async function sweepReservations(): Promise<SweepReport> {
    const db = getFirestore();
    const reservations = await db
        .collection(UsernameCollection)
        .limit(SweepPerRun)
        .get();

    const report: SweepReport = { released: 0, retired: 0, kept: 0 };
    const now = Date.now();

    await PromisePool.for(reservations.docs)
        .withConcurrency(3)
        .process(async (doc) => {
            const held = doc.data() as Reservation;
            const action = reservationAction(held, now);
            if (action === 'keep') {
                report.kept++;
                return;
            }
            if (action === 'release') {
                await doc.ref.delete();
                report.released++;
                return;
            }
            if (held.uid === null) return;

            const exists = await getAuth()
                .getUser(held.uid)
                .then(() => true)
                .catch(() => false);
            if (exists) {
                report.kept++;
                return;
            }

            await doc.ref.update({ uid: null, retiredAt: now });
            // The handle is what the rest of the app reads, so it goes; the
            // tombstone is what keeps the name from being re-issued.
            await db
                .collection(HandleCollection)
                .doc(held.uid)
                .delete()
                .catch(() => undefined);
            report.retired++;
        });

    console.log('Username reservation sweep:', JSON.stringify(report));
    return report;
}
