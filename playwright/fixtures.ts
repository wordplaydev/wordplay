import { test as baseTest } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export * from '@playwright/test';

/** Generates a worker-specific username based on parallelIndex */
function getUsernameForWorker(): string {
    return `user${test.info().parallelIndex}`;
}

export const test = baseTest.extend<
    { loggedInUsername: string },
    { workerStorageState: string }
>({
    // Provide the test username to all tests in this worker.
    loggedInUsername: async ({ }, use) => {
        await use(getUsernameForWorker());
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

            // Acquire a unique account, for example create a new one.
            // Alternatively, you can have a list of precreated accounts for testing.
            // Make sure that accounts are unique, so that multiple team members
            // can run tests at the same time without interference.
            const account = {
                username: getUsernameForWorker(),
                password: 'password',
            };

            // Go to the join page.
            await page.goto('/join');

            // Create a new account by filling out the form.
            await page.getByTestId('username-field').fill(account.username);
            await page.getByTestId('password-field').fill(account.password);
            await page
                .getByTestId('password-repeat-field')
                .fill(account.password);
            await page.getByTestId('join-button').click();

            // Wait for the final redirect URL to ensure that the cookies are actually set.
            await page.waitForURL('/profile', {
                waitUntil: 'domcontentloaded',
            });

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
