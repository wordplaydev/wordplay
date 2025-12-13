import { test as baseTest } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export * from '@playwright/test';
export const test = baseTest.extend<{}, { workerStorageState: string }>({
    // Use the same storage state for all tests in this worker.
    storageState: ({ workerStorageState }, use) => use(workerStorageState),
    // Authenticate once per worker with a worker-scoped fixture.
    workerStorageState: [
        async ({ browser }, use) => {
            // Use parallelIndex as a unique identifier for each worker.
            const id = test.info().parallelIndex;
            const fileName = path.resolve('playwright', '.auth', `${id}.json`);

            if (fs.existsSync(fileName)) {
                // Reuse existing authentication state if any.
                await use(fileName);
                return;
            }

            // Important: make sure we authenticate in a clean environment by unsetting storage state.
            const page = await browser.newPage({
                baseURL: 'http://localhost:4173',
            });

            // Acquire a unique account, for example create a new one.
            // Alternatively, you can have a list of precreated accounts for testing.
            // Make sure that accounts are unique, so that multiple team members
            // can run tests at the same time without interference.
            const account = {
                username: `user${id}`,
                password: 'password',
            };

            // Go to the join page.
            await page.goto('/join');

            // Create a new account.
            await page.getByTestId('username-field').fill(account.username);
            await page.getByTestId('password-field').fill(account.password);
            await page
                .getByTestId('password-repeat-field')
                .fill(account.password);
            await page.getByTestId('join-button').click();

            // Wait for the final redirect URL to ensure that the cookies are actually set.
            await page.waitForURL('/profile');

            // End of authentication steps. We need to explicitly ask Playwright to save the indexedDB data stored by Firebase.
            await page
                .context()
                .storageState({ path: fileName, indexedDB: true });
            await page.close();
            await use(fileName);
        },
        { scope: 'worker' },
    ],
});
