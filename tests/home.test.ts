import { test, expect, type Page } from '@playwright/test';

const Local = 'http://localhost:5173/';

test('has Wordplay window title', async ({ page }) => {
    await page.goto(Local);

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle('Wordplay');
});

test('has Wordplay header', async ({ page }) => {
    await page.goto(Local);

    // Expects page to have a heading with the name Wordplay.
    await expect(page.getByRole('heading', { name: 'Wordplay' })).toBeVisible();
});

function clickLinkAndCheckHeader(page: Page, linkAndHeader: string) {
    return async () => {
        await page.goto(Local);

        // Click the get started link.
        await page.getByRole('link', { name: linkAndHeader }).click();

        // Expects page to have a heading with the name Wordplay.
        await expect(
            page.getByRole('heading', { name: linkAndHeader })
        ).toBeVisible();
    };
}

test('learn link works', async ({ page }) => {
    clickLinkAndCheckHeader(page, 'Learn');
});

test('project link works', async ({ page }) => {
    clickLinkAndCheckHeader(page, 'Projects');
});

test('galleries link works', async ({ page }) => {
    clickLinkAndCheckHeader(page, 'Galleries');
});

test('about link works', async ({ page }) => {
    clickLinkAndCheckHeader(page, 'About');
});

test('rights link works', async ({ page }) => {
    clickLinkAndCheckHeader(page, 'Rights');
});
