import { test, expect } from '@playwright/test';

test('create project and visit its tiles ', async ({ page }) => {
    await page.goto('/');

    // Visit the projects page
    await page.getByText('Projects').click();

    // Create a new blank project
    await page.getByTestId('addproject').click();

    // Click the first preview link
    await page.getByTestId('preview').nth(1).click();

    // Expect an output view
    await expect(page.getByTestId('output')).toHaveCount(1);

    // Expect to have an editor view
    await expect(page.getByTestId('editor')).toHaveCount(1);

    // Click to open the guide and expect it to be visible.
    await page.getByText(/.+guide/, {}).click();

    // Expect the guide to be visible.
    await expect(page.getByTestId('documentation')).toBeVisible();

    // Click to open the palette
    await page
        .getByRole('button')
        .filter({ has: page.getByText(/.+palette/) })
        .click();

    // Expect the palette to be visible.
    await expect(page.getByTestId('palette')).toBeVisible();
});
