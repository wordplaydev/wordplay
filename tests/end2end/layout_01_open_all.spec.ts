import { test, expect } from '@playwright/test';

test('create project and visit its tiles ', async ({ page }) => {
    await page.goto('/projects');

    // Create a new blank project
    await page.getByTestId('addproject').click();

    // Click the first preview link
    await page.getByTestId('preview').nth(0).click();

    // Wait for the URL redirect to the project.
    await page.waitForURL(/\/project\/.+/);

    // Click to open the guide
    await page.getByTestId('docs-toggle').click();

    // Click to open the palette
    await page.getByTestId('palette-toggle').click();

    // Expect all four tiles to be visible.
    await Promise.all([
        expect(page.getByTestId('output')).toBeVisible(),
        expect(page.getByTestId('editor')).toBeVisible(),
        expect(page.getByTestId('documentation')).toBeVisible(),
        expect(page.getByTestId('palette')).toBeVisible(),
    ]);
});
