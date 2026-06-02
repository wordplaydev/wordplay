import type { Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
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
 * Spin up a browser context signed in as the given user (creating the
 * account first if needed). Returns the context, the signed-in page, and
 * the user's UID — the UID is convenient for setting up Firestore-side
 * fixtures that have to reference the same auth subject the browser is
 * signed in as.
 *
 * Each test that needs two distinct sessions should call this twice with
 * different usernames so each context owns its own localStorage,
 * IndexedDB, and writer ID — the realistic two-device scenario.
 *
 * # Storage-state caching
 *
 * The full login flow takes ~7s on Firefox CI (longer than Chromium —
 * the login button has stability-retry stalls), so doing it twice
 * per test eats most of the 30s test timeout before assertions even
 * begin. To keep retries cheap, we persist Firebase Auth state to
 * `playwright/.auth/${username}.json` after a successful login and
 * load it directly on subsequent calls with the same username.
 *
 * Cache hits skip the entire login UI flow — `browser.newContext({
 * storageState })` restores cookies, localStorage, and IndexedDB,
 * which is everything Firebase Auth needs to resume the session. We
 * still resolve the UID via the admin SDK on each call since
 * downstream callers expect it.
 *
 * Cache lifetime is "as long as the file exists on disk." CI
 * workspaces start fresh per run, so the first invocation in any
 * given CI run still pays the full login cost; subsequent retries
 * within that run reuse the cached state. For caching to work at
 * all, callers must pass a *stable* username — randomly minted
 * per-run usernames will miss the cache every time.
 */
export async function loginNewContext(
    browser: Browser,
    username: string,
    password: string,
): Promise<{ context: BrowserContext; page: Page; uid: string }> {
    const cacheDir = path.resolve('playwright', '.auth');
    const cacheFile = path.resolve(cacheDir, `${username}.json`);

    if (fs.existsSync(cacheFile)) {
        const context = await browser.newContext({
            baseURL: 'http://127.0.0.1:5002',
            storageState: cacheFile,
        });
        const page = await context.newPage();
        const uid = await uidForUsername(username);
        return { context, page, uid };
    }

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

    // Persist auth so a retry in the same CI run can skip the UI flow.
    // indexedDB:true is required — Firebase Auth keeps tokens there, not
    // in cookies. Two workers running different spec files can call this
    // concurrently with the same shared username (e.g. 'creator'), so write
    // to a per-process temp file and rename into place — rename is atomic on
    // the same filesystem, avoiding a half-written file a parallel reader
    // would fail to parse.
    fs.mkdirSync(cacheDir, { recursive: true });
    const tmpFile = path.resolve(cacheDir, `${username}.${process.pid}.tmp.json`);
    await context.storageState({ path: tmpFile, indexedDB: true });
    fs.renameSync(tmpFile, cacheFile);

    const uid = await uidForUsername(username);
    return { context, page, uid };
}
