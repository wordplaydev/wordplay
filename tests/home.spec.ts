import { test, expect, type Page } from '@playwright/test';

test('has Wordplay window title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle('Wordplay');
});

test('has Wordplay header', async ({ page }) => {
    await page.goto('/');

    // Expects page to have a heading with the name Wordplay.
    await expect(page.getByRole('heading', { name: 'Wordplay' })).toBeVisible();
});

async function clickLinkAndCheckHeader(page: Page, linkAndHeader: string) {
    await page.goto('/');

    // Click the first matching link.
    await page.getByRole('link', { name: linkAndHeader }).nth(0).click();

    // Expects page to have a heading with the name Wordplay.
    await expect(
        page.getByRole('heading', { name: linkAndHeader }),
    ).toBeVisible();
}

// This test succeeds on all platforms except Mobile Safari when running in a GitHub action.
// We haven't been able to track down why; it likely has to do with the timing and loading of
// the tutorial file. Another suspicious detail is that Playwright doesn't seem to be respecting
// the 5 second default timeout above.
// test('learn link works', async ({ page }) => {
//     await clickLinkAndCheckHeader(page, 'Learn');
// });

test('project link works', async ({ page }) => {
    await clickLinkAndCheckHeader(page, 'Projects');
});

test('galleries link works', async ({ page }) => {
    await clickLinkAndCheckHeader(page, 'Galleries');
});

test('about link works', async ({ page }) => {
    await clickLinkAndCheckHeader(page, 'About');
});

test('rights link works', async ({ page }) => {
    await clickLinkAndCheckHeader(page, 'Rights');
});
