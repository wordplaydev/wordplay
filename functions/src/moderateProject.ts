import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type {
    ModerateProjectInputs,
    ModerateProjectOutput,
    Strikes,
} from 'shared-types';
import { noStrikes, withStrike } from './strikes.js';

/** Server-authoritative moderation records. Mirrors `usage/{uid}`: readable by
 *  its subject and by moderators, writable by nobody but this function. A
 *  creator who could write their own record could clear their own strikes. */
const StrikesCollection = 'strikes';
const ProjectsCollection = 'projects';

/** Firestore caps a batched write at 500 operations, and the takedown query
 *  below is unbounded — a prolific creator can have more public projects than
 *  one commit holds. Flush below the cap rather than throwing after the strike
 *  and the claim have already been written. */
const BatchLimit = 450;

/**
 * Record a moderator's decision about a project (#193).
 *
 * Everything a decision does happens here rather than in the client, because
 * all of it has to be trustworthy: the flags a viewer is warned by, the count
 * that leads to losing public sharing, and the claim that enforces it.
 */
export default async function moderateProject(
    request: CallableRequest<ModerateProjectInputs>,
): Promise<ModerateProjectOutput> {
    // Only moderators, and the token is the authority — not the client's word.
    if (request.auth?.token.mod !== true)
        throw new HttpsError(
            'permission-denied',
            'Only moderators can moderate projects.',
        );

    const { project: projectID, flags, strike, decision } = request.data;
    if (typeof projectID !== 'string' || projectID.length === 0)
        throw new HttpsError('invalid-argument', 'Expected a project id.');
    if (typeof flags !== 'object' || flags === null)
        throw new HttpsError('invalid-argument', 'Expected flags.');
    // Required even for a decision that doesn't strike, so a caller can't
    // silently opt out of being counted once by omitting it.
    if (typeof decision !== 'string' || decision.length === 0)
        throw new HttpsError('invalid-argument', 'Expected a decision id.');

    const db = getFirestore();
    const auth = getAuth();
    const projectRef = db.collection(ProjectsCollection).doc(projectID);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists)
        throw new HttpsError('not-found', 'No such project.');

    const owner: unknown = projectDoc.get('owner');
    const violation = Object.values(flags).some((state) => state === true);

    // Write the decision itself. A project found to break the rules also stops
    // being public: leaving it up while warning its creator would be a warning
    // with nothing behind it.
    await projectRef.update(violation ? { flags, public: false } : { flags });

    // Resolve any reports about this project — the question they asked has now
    // been answered, whichever way.
    const reports = await db
        .collection('reports')
        .where('project', '==', projectID)
        .where('resolved', '==', false)
        .get();
    await Promise.all(
        reports.docs.map((report) =>
            report.ref.update({
                resolved: true,
                upheld: violation,
                moderator: request.auth?.uid ?? null,
            }),
        ),
    );

    // A project with no owner — an unclaimed local project that reached the
    // cloud — has nobody to hold responsible.
    if (!strike || typeof owner !== 'string' || owner.length === 0)
        return { count: 0, banned: false };

    const strikesRef = db.collection(StrikesCollection).doc(owner);
    const updated = await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(strikesRef);
        const current: Strikes = existing.exists
            ? { ...noStrikes(), ...existing.data() }
            : noStrikes();
        // withStrike is idempotent on this, so a retry of a decision whose
        // response was lost leaves the record alone.
        const next = withStrike(current, {
            decision,
            project: projectID,
            flags: Object.entries(flags)
                .filter(([, state]) => state === true)
                .map(([flag]) => flag),
            moderator: request.auth?.uid ?? '',
            time: Date.now(),
        });
        transaction.set(strikesRef, next);
        return next;
    });

    // Losing public sharing is enforced by a custom claim rather than by
    // reading this record in the security rules: rules would have to `get()`
    // it on every project write, which is the app's hottest path, and the
    // rules file already documents how tight that budget is.
    if (updated.banned) {
        // Read the existing claims and keep them. `setCustomUserClaims`
        // replaces the whole object, so writing `{ banned: true }` alone would
        // quietly strip someone's `mod` or `teacher` role.
        const existing = (await auth.getUser(owner)).customClaims ?? {};
        if (existing.banned !== true)
            await auth.setCustomUserClaims(owner, {
                ...existing,
                banned: true,
            });

        // Take down what they've already published. The ban stops new public
        // content; without this, everything already public would stay up.
        const published = await db
            .collection(ProjectsCollection)
            .where('owner', '==', owner)
            .where('public', '==', true)
            .get();
        for (let i = 0; i < published.docs.length; i += BatchLimit) {
            const batch = db.batch();
            for (const doc of published.docs.slice(i, i + BatchLimit))
                batch.update(doc.ref, { public: false });
            await batch.commit();
        }
    }

    return { count: updated.count, banned: updated.banned };
}
