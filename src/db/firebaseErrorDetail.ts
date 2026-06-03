import { FirebaseError } from 'firebase/app';

/** The short, loggable detail for a failed Firebase operation: a FirebaseError's
 *  code (e.g. "permission-denied"), or undefined for anything else. Centralized
 *  so every save-failure path records the same kind of detail. */
export default function firebaseErrorDetail(
    error: unknown,
): string | undefined {
    return error instanceof FirebaseError ? error.code : undefined;
}
