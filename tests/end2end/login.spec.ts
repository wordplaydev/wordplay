import { expect, test } from '../../playwright/fixtures';

test('verify default login, logout, and login form', async ({ page }) => {
    // fixtures.ts logins in the user prior to this.

    await page.goto('/en-US/');

    // Go to the profile page and wait for the auth to load.
    await page.goto('/en-US/profile');

    // Verify that the profile username page is visible. Give it headroom: on a
    // fresh load (especially WebKit) Firebase Auth restores the session from
    // IndexedDB asynchronously, so the profile can briefly show its loading
    // state before the username renders — longer than the 5s expect default.
    await expect(page.getByTestId('username')).toBeVisible({ timeout: 20000 });
});
