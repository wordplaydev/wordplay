import type { Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
/** The Auth emulator's admin REST surface, which `owner` is the documented
 *  bearer token for. Used instead of `firebase-admin/auth`: that entry point is
 *  CJS and reaches `require('jose')`, which is ESM-only, and under Playwright's
 *  loader the require fails ("is from a module not been linked") — taking every
 *  spec that imports this helper out of the run before a test could load. A
 *  UID lookup needs one HTTP call, not the admin SDK. */
const AuthEmulator = 'http://127.0.0.1:9099';
const EmulatorProject = 'demo-wordplay';

/**
 * Resolve a Firebase Auth UID from a Wordplay username. Wordplay derives
 * emails from usernames via the @u.wordplay.dev convention (see
 * Creator.usernameEmail), so this lookup mirrors the same translation.
 */
export async function uidForUsername(username: string): Promise<string> {
    const email = `${username}@u.wordplay.dev`;
    const response = await fetch(
        `${AuthEmulator}/identitytoolkit.googleapis.com/v1/projects/${EmulatorProject}/accounts:lookup`,
        {
            method: 'POST',
            headers: {
                Authorization: 'Bearer owner',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: [email] }),
        },
    );
    if (!response.ok)
        throw new Error(
            `Auth emulator rejected the lookup of ${email}: ${response.status}`,
        );
    const found: unknown = await response.json();
    const users =
        typeof found === 'object' && found !== null && 'users' in found
            ? found.users
            : undefined;
    const first: unknown = Array.isArray(users) ? users[0] : undefined;
    const uid =
        typeof first === 'object' && first !== null && 'localId' in first
            ? first.localId
            : undefined;
    if (typeof uid !== 'string')
        throw new Error(`No account for ${email} in the auth emulator`);
    return uid;
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
 * The full login flow takes several seconds on the slower CI engines
 * (WebKit on the Linux runner especially), so doing it twice per test
 * eats much of the test timeout before assertions even begin. To keep
 * retries cheap, we persist Firebase Auth state to
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
    options?: { colorScheme?: 'light' | 'dark' },
): Promise<{ context: BrowserContext; page: Page; uid: string }> {
    const cacheDir = path.resolve('playwright', '.auth');
    const cacheFile = path.resolve(cacheDir, `${username}.json`);

    if (fs.existsSync(cacheFile)) {
        const context = await browser.newContext({
            baseURL: 'http://127.0.0.1:5002',
            storageState: cacheFile,
            // Manually-created contexts don't inherit the config's
            // use.contextOptions, so set reduced motion here too — keeps the
            // animated typography from stalling clicks (WebKit) and lightens
            // the app's per-frame work on a contended runner.
            reducedMotion: 'reduce',
            ...(options?.colorScheme !== undefined
                ? { colorScheme: options.colorScheme }
                : {}),
        });
        const page = await context.newPage();
        const uid = await uidForUsername(username);
        return { context, page, uid };
    }

    const context = await browser.newContext({
        baseURL: 'http://127.0.0.1:5002',
        storageState: { cookies: [], origins: [] },
        reducedMotion: 'reduce',
        ...(options?.colorScheme !== undefined
            ? { colorScheme: options.colorScheme }
            : {}),
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
    const tmpFile = path.resolve(
        cacheDir,
        `${username}.${process.pid}.tmp.json`,
    );
    await context.storageState({ path: tmpFile, indexedDB: true });
    fs.renameSync(tmpFile, cacheFile);

    const uid = await uidForUsername(username);
    return { context, page, uid };
}
