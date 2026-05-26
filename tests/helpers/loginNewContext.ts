import type { Browser, BrowserContext, Page } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/** Reuses a singleton admin-auth app to look up UIDs by email; calling
 *  initializeApp twice under the same name throws. */
let authApp: ReturnType<typeof initializeApp> | null = null;
function getAuthAdmin() {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    if (authApp === null) {
        try {
            authApp = initializeApp(
                { projectId: 'demo-wordplay' },
                'auth-admin-collab',
            );
        } catch {
            // initializeApp throws if the named app exists; getAuth() still
            // works as long as some app is initialized.
        }
    }
    return getAuth(authApp ?? undefined);
}

/**
 * Resolve a Firebase Auth UID from a Wordplay username. Wordplay derives
 * emails from usernames via the @u.wordplay.dev convention (see
 * Creator.usernameEmail), so this lookup mirrors the same translation.
 */
export async function uidForUsername(username: string): Promise<string> {
    const email = `${username}@u.wordplay.dev`;
    const user = await getAuthAdmin().getUserByEmail(email);
    return user.uid;
}

/**
 * Spin up a fresh browser context with no shared storage and sign the given
 * user in (creating the account first if needed). Returns the context, the
 * signed-in page, and the user's UID — the UID is convenient for setting up
 * Firestore-side fixtures that have to reference the same auth subject the
 * browser is signed in as.
 *
 * Each test that needs two distinct sessions should call this twice with
 * different usernames so each context owns its own localStorage, IndexedDB,
 * and writer ID — the realistic two-device scenario.
 */
export async function loginNewContext(
    browser: Browser,
    username: string,
    password: string,
): Promise<{ context: BrowserContext; page: Page; uid: string }> {
    const context = await browser.newContext({
        baseURL: 'http://127.0.0.1:5002',
        storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    // Try login first; on emulator reruns the account already exists.
    await page.goto('/en-US/login');
    await page.locator('#login-username-field').fill(username);
    await page.locator('#login-password-field').fill(password);
    await page.getByTestId('login-button').click();

    const loggedIn = await page
        .waitForURL(/\/profile$/, {
            waitUntil: 'domcontentloaded',
            timeout: 5000,
        })
        .then(() => true)
        .catch(() => false);

    if (!loggedIn) {
        await page.goto('/en-US/join');
        await page.getByTestId('username-field').fill(username);
        await page.getByTestId('password-field').fill(password);
        await page.getByTestId('password-repeat-field').fill(password);
        await page.getByTestId('join-button').click();
        await page.waitForURL(/\/profile$/, { waitUntil: 'domcontentloaded' });
    }

    const uid = await uidForUsername(username);
    return { context, page, uid };
}
