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

    // Click to open the collaboration panel
    await page.getByTestId('collaborate-toggle').click();

    // Expect all tiles to be visible.
    await Promise.all([
        expect(page.getByTestId('tile-output')).toBeVisible(),
        expect(page.getByTestId('tile-source0')).toBeVisible(),
        expect(page.getByTestId('tile-docs')).toBeVisible(),
        expect(page.getByTestId('tile-palette')).toBeVisible(),
        expect(page.getByTestId('tile-collaborate')).toBeVisible(),
    ]);
});
