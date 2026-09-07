import { FirebaseError } from 'firebase/app';

/** The short, loggable detail for a failed Firebase operation: a FirebaseError's
 *  code (e.g. "permission-denied"), or undefined for anything else. Centralized
 *  so every save-failure path records the same kind of detail. */
export default function firebaseErrorDetail(
    error: unknown,
): string | undefined {
    return error instanceof FirebaseError ? error.code : undefined;
}

/**
 * Whether a failed cloud write can never succeed by being retried: the rules
 * refused it, or the payload is malformed. Deliberately narrow and disjoint from
 * the transient codes `Database.isConnectivityError` names, because wrongly
 * calling a transient failure permanent throws away a local edit — `not-found`
 * is excluded because the create-capable replays exist for exactly that, and
 * `unauthenticated` because signing back in restores it.
 *
 * Beside {@link firebaseErrorDetail} because both read meaning off the same
 * error, and mirroring {@link isQuotaError}: one place decides, so every save
 * path classifies a rejection the same way. A refusal is only believed after
 * `refreshAuthToken` and one replay; see `SaveTracker.replayAfterRefresh`.
 */
export function isPermanentSaveError(error: unknown): boolean {
    return (
        error instanceof FirebaseError &&
        (error.code === 'permission-denied' ||
            error.code === 'invalid-argument')
    );
}
