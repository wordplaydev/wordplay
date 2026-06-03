import { expect, test } from '@playwright/test';

test.describe('Editor → Output cross-component flow', () => {

    // Smoke check of the home page: window title and the "Wordplay" header.
    // (Navigation to Learn/Guide and the other top-level pages is covered by
    // page-headers.spec.ts, which clicks each link and asserts its heading.)
    test('home page loads with title and header', async ({ page }) => {
        await page.goto('/en-US');
        await expect(page).toHaveTitle('Wordplay', { timeout: 8000 });
        await expect(
            page.getByRole('heading', { name: 'Wordplay' }),
        ).toBeVisible();
    });

    test('language switcher is present on home page', async ({ page }) => {
        await page.goto('/en-US');
        const langButton = page.getByText('English').or(page.locator('[aria-label*="language"]'));
        await expect(langButton.first()).toBeVisible({ timeout: 8000 });
    });

});
