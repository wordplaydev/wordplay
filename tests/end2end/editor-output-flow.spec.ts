import { expect, test } from '@playwright/test';

test.describe('Editor → Output cross-component flow', () => {

    test('home page loads successfully', async ({ page }) => {
        await page.goto('/en-US');
        await expect(page).toHaveTitle(/Wordplay/, { timeout: 8000 });
    });

    test('navigating to Learn page works', async ({ page }) => {
        await page.goto('/en-US');
        await page.getByRole('link', { name: 'Learn' }).first().click();
        await page.waitForURL(/\/learn/, { timeout: 8000 });
        await expect(page).toHaveURL(/learn/);
    });

    test('navigating to Guide page works', async ({ page }) => {
        await page.goto('/en-US');
        await page.getByRole('link', { name: 'Guide' }).first().click();
        await page.waitForURL(/\/guide/, { timeout: 8000 });
        await expect(page).toHaveURL(/guide/);
    });

    test('language switcher is present on home page', async ({ page }) => {
        await page.goto('/en-US');
        const langButton = page.getByText('English').or(page.locator('[aria-label*="language"]'));
        await expect(langButton.first()).toBeVisible({ timeout: 8000 });
    });

});
