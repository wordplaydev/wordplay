import type LocaleText from '@locale/LocaleText';
import { FirebaseError } from 'firebase/app';
import type { LocaleTextAccessor } from '../../locale/Locales';

function getFirebaseErrorCodeDescription(
    code: string,
): LocaleTextAccessor | undefined {
    return (
        {
            'auth/user-not-found': (l: LocaleText) =>
                l.ui.page.login.error.wrongPassword,
            'auth/id-token-expired': (l: LocaleText) =>
                l.ui.page.login.error.expired,
            'auth/id-token-revoked': (l: LocaleText) =>
                l.ui.page.login.error.invalid,
            'auth/invalid-argument': (l: LocaleText) =>
                l.ui.page.login.error.invalid,
            'auth/invalid-email': (l: LocaleText) =>
                l.ui.page.login.error.email,
            'auth/email-already-in-use': (l: LocaleText) =>
                l.ui.page.login.error.wrongPassword,
            'auth/wrong-password': (l: LocaleText) =>
                l.ui.page.login.error.wrongPassword,
            'auth/network-request-failed': (l: LocaleText) =>
                l.ui.page.login.error.offline,
            'auth/too-many-requests': (l: LocaleText) =>
                l.ui.page.login.error.tooMany,
        }[code] ?? ((l) => l.ui.page.login.error.failure)
    );
}

export default function getAuthErrorDescription(err: unknown) {
    // Log the error in case we need to troubleshoot with someone.
    console.error(err);
    if (err instanceof FirebaseError) {
        return getFirebaseErrorCodeDescription(err.code);
    } else {
        return (l: LocaleText) => l.ui.page.login.error.failure;
    }
}
