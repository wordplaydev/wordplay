import { test as baseTest, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export * from '@playwright/test';

/** Generates a worker-specific username based on parallelIndex */
function getUsernameForWorker(): string {
    return `user${test.info().parallelIndex}`;
}

/** Attach a console listener that mirrors [crdt-debug] messages to the test
 *  output so we can read them out of CI artifacts. */
function tapCrdtConsole(page: Page, label: string): void {
    page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('[crdt-debug]')) {
            // eslint-disable-next-line no-console
            console.log(`[${label}] ${text}`);
        }
    });
}

export const test = baseTest.extend<
    { loggedInUsername: string; page: Page },
    { workerStorageState: string }
>({
    // Provide the test username to all tests in this worker.
    loggedInUsername: async ({ }, use) => {
        await use(getUsernameForWorker());
    },
    // Tap browser console for [crdt-debug] messages on the default page.
    page: async ({ page }, use) => {
        tapCrdtConsole(page, 'page');
        // Also tap any additional pages opened from the same context.
        page.context().on('page', (p) => tapCrdtConsole(p, 'tab'));
        await use(page);
    },
    // Use the same storage state for all tests in this worker.
    storageState: ({ workerStorageState }, use) => use(workerStorageState),
    // Authenticate once per worker with a worker-scoped fixture.
    workerStorageState: [
        async ({ browser }, use) => {
            // Use parallelIndex as a unique identifier for each worker.
            const id = test.info().parallelIndex;
            const fileName = path.resolve('playwright', `.auth/${id}.json`);

            if (fs.existsSync(fileName)) {
                // Reuse existing authentication state if any.
                await use(fileName);
                return;
            }

            // Important: make sure we authenticate in a clean environment by unsetting storage state.
            const page = await browser.newPage({
                baseURL: 'http://127.0.0.1:5002',
                storageState: { cookies: [], origins: [] },
            });

            const account = {
                username: getUsernameForWorker(),
                password: 'password',
            };

            // Try logging in first — on a retry the user may already exist in the emulator.
            await page.goto('/en-US/login');
            await page.locator('#login-username-field').fill(account.username);
            await page.locator('#login-password-field').fill(account.password);
            await page.getByTestId('login-button').click();

            const loggedIn = await page
                .waitForURL(/\/profile$/, { waitUntil: 'domcontentloaded', timeout: 5000 })
                .then(() => true)
                .catch(() => false);

            if (!loggedIn) {
                // User doesn't exist yet — create the account.
                await page.goto('/en-US/join');
                await page.getByTestId('username-field').fill(account.username);
                await page.getByTestId('password-field').fill(account.password);
                await page.getByTestId('password-repeat-field').fill(account.password);
                await page.getByTestId('join-button').click();

                await page.waitForURL(/\/profile$/, { waitUntil: 'domcontentloaded' });
            }

            // Ask Playwright to save the indexedDB data stored by Firebase.
            await page
                .context()
                .storageState({ path: fileName, indexedDB: true });

            // Close the page.
            await page.close();

            // Use the stored state.
            await use(fileName);
        },
        { scope: 'worker' },
    ],
});
