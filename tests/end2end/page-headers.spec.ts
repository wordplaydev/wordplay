import { test, expect, type Page } from '@playwright/test';
import goHome from './goHome';

async function clickLinkAndCheckHeader(page: Page, linkAndHeader: string) {
    await goHome(page);

    // Click the first matching link.
    await page.getByText(linkAndHeader).nth(0).click();

    // Expects page to have a heading with the name Wordplay.
    await expect(
        page.getByRole('heading', { name: linkAndHeader }),
    ).toBeVisible({ timeout: 10000 });
}

// This test succeeds on all platforms except Mobile Safari when running in a GitHub action.
// We haven't been able to track down why; it likely has to do with the timing and loading of
// the tutorial file. Another suspicious detail is that Playwright doesn't seem to be respecting
// the 5 second default timeout above.
// test('learn link works', async ({ page }) => {
//     await clickLinkAndCheckHeader(page, 'Learn');
// });

[
    'Projects',
    'Galleries',
    'Learn',
    'Guide',
    'About',
    'Login',
    'Rights',
    'Donate',
].forEach((link) => {
    test(`${link} link loads`, async ({ page }) =>
        await clickLinkAndCheckHeader(page, link));
});
