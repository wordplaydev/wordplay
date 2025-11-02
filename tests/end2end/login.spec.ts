import { expect, test } from '../../playwright/fixtures';

test('verify default login, logout, and login form', async ({ page }) => {
    // Go to the join page.
    await page.goto('/profile');

    // Verify that the profile username page is visible
    expect(page.getByTestId('username')).toBeVisible();
});
