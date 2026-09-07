import { FirebaseError } from 'firebase/app';
import { describe, expect, it } from 'vitest';
import firebaseErrorDetail, {
    isPermanentSaveError,
} from './firebaseErrorDetail';

/** The codes `Database.isConnectivityError` treats as transient. Repeated here
 *  rather than imported because `@db/Database` drags the whole persistence
 *  graph into what is otherwise a pure test; the assertion below is what keeps
 *  the two lists from ever overlapping. */
const TransientCodes = [
    'unavailable',
    'deadline-exceeded',
    'cancelled',
    'internal',
    'aborted',
    'resource-exhausted',
];

describe('firebaseErrorDetail', () => {
    it("reports a Firebase error's code and nothing else", () => {
        expect(
            firebaseErrorDetail(new FirebaseError('not-found', 'No document')),
        ).toBe('not-found');
        expect(firebaseErrorDetail(new Error('not-found'))).toBeUndefined();
    });
});

describe('isPermanentSaveError', () => {
    it('matches a rules refusal, which replaying cannot change', () => {
        expect(
            isPermanentSaveError(
                new FirebaseError('permission-denied', 'Missing permissions'),
            ),
        ).toBe(true);
    });

    it('matches a malformed payload, which retrying cannot make valid', () => {
        expect(
            isPermanentSaveError(
                new FirebaseError('invalid-argument', 'Bad document'),
            ),
        ).toBe(true);
    });

    it('does not match not-found, which the create-capable replays exist for', () => {
        expect(
            isPermanentSaveError(new FirebaseError('not-found', 'No document')),
        ).toBe(false);
    });

    it('does not match unauthenticated, which signing back in restores', () => {
        expect(
            isPermanentSaveError(
                new FirebaseError('unauthenticated', 'Signed out'),
            ),
        ).toBe(false);
    });

    it('is disjoint from the transient codes, so nothing is both', () => {
        for (const code of TransientCodes)
            expect(
                isPermanentSaveError(new FirebaseError(code, code)),
                `"${code}" is transient and must stay retryable`,
            ).toBe(false);
    });

    it('does not match a plain error or a non-error', () => {
        expect(isPermanentSaveError(new Error('permission-denied'))).toBe(
            false,
        );
        expect(isPermanentSaveError('permission-denied')).toBe(false);
        expect(isPermanentSaveError(undefined)).toBe(false);
    });
});
