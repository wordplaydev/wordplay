import type Locales from '../../locale/Locales';

export function getLoginErrorDescription(
    code: string,
    locales: Locales
): string | undefined {
    return {
        'auth/id-token-expired': locales.get(
            (l) => l.ui.page.login.error.expired
        ),
        'auth/id-token-revoked': locales.get(
            (l) => l.ui.page.login.error.invalid
        ),
        'auth/invalid-argument': locales.get(
            (l) => l.ui.page.login.error.invalid
        ),
        'auth/invalid-email': locales.get((l) => l.ui.page.login.error.email),
        'auth/wrong-password': locales.get(
            (l) => l.ui.page.login.error.wrongPassword
        ),
    }[code];
}
