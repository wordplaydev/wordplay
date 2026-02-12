import { expect, test } from '../../playwright/fixtures';

test('verify default login, logout, and login form', async ({ page }) => {
    // fixtures.ts logins in the user prior to this.

    await page.goto('/');

    // Go to the profile page and wait for the auth to load.
    await page.goto('/profile');

    // Verify that the profile username page is visible
    await expect(page.getByTestId('username')).toBeVisible();
});
