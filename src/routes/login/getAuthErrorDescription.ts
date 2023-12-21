import { FirebaseError } from 'firebase/app';
import type Locales from '../../locale/Locales';

function getFirebaseErrorCodeDescription(
    code: string,
    locales: Locales,
): string | undefined {
    return (
        {
            'auth/user-not-found': locales.get(
                (l) => l.ui.page.login.error.wrongPassword,
            ),
            'auth/id-token-expired': locales.get(
                (l) => l.ui.page.login.error.expired,
            ),
            'auth/id-token-revoked': locales.get(
                (l) => l.ui.page.login.error.invalid,
            ),
            'auth/invalid-argument': locales.get(
                (l) => l.ui.page.login.error.invalid,
            ),
            'auth/invalid-email': locales.get(
                (l) => l.ui.page.login.error.email,
            ),
            'auth/email-already-in-use': locales.get(
                (l) => l.ui.page.login.error.wrongPassword,
            ),
            'auth/wrong-password': locales.get(
                (l) => l.ui.page.login.error.wrongPassword,
            ),
            'auth/network-request-failed': locales.get(
                (l) => l.ui.page.login.error.offline,
            ),
        }[code] ?? locales.get((l) => l.ui.page.login.error.failure)
    );
}

export default function getAuthErrorDescription(
    locales: Locales,
    err: unknown,
) {
    // Log the error in case we need to troubleshoot with someone.
    console.error(err);
    if (err instanceof FirebaseError) {
        return getFirebaseErrorCodeDescription(err.code, locales);
    } else {
        return locales.get((l) => l.ui.page.login.error.failure);
    }
}
