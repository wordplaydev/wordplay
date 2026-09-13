import { FirebaseError } from 'firebase/app';
import { describe, expect, it } from 'vitest';
import firebaseErrorDetail, {
    isPermanentSaveError,
    isAttestationFailure,
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

describe('isAttestationFailure', () => {
    it('matches a callable refused by App Check', () => {
        expect(
            isAttestationFailure(
                new FirebaseError(
                    'functions/unauthenticated',
                    'Unauthenticated',
                ),
            ),
        ).toBe(true);
    });

    // The prefix is the whole distinction: Firestore's bare `unauthenticated`
    // means signed out, which signing back in restores.
    it("does not match Firestore's signed-out code", () => {
        expect(
            isAttestationFailure(
                new FirebaseError('unauthenticated', 'Signed out'),
            ),
        ).toBe(false);
    });

    it('does not match another callable failure', () => {
        expect(
            isAttestationFailure(
                new FirebaseError(
                    'functions/resource-exhausted',
                    'Out of budget',
                ),
            ),
        ).toBe(false);
    });

    it('does not match something that is not a FirebaseError', () => {
        expect(
            isAttestationFailure(new Error('functions/unauthenticated')),
        ).toBe(false);
        expect(isAttestationFailure(undefined)).toBe(false);
    });
});
