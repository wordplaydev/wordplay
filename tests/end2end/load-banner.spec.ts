import { expect, test } from '@playwright/test';

/**
 * The app-wide banner is for failures the user can act on, raised by something
 * the user did. It must never carry the failure of a background read.
 *
 * The regression this guards: the gallery page asked Firestore for the classes
 * associated with the gallery on every view, and firestore.rules only allows
 * listing classes when signed in — so every signed-out visitor got a
 * permission-denied, which raised a red "we couldn't load that" strip for eight
 * seconds. Long enough to still be on screen two navigations later, so it read
 * as an error about pages that had loaded fine.
 *
 * These tests are deliberately signed out: they import `test` from Playwright
 * rather than the authenticating fixture.
 */

/** How long to watch for a banner. The read it guards against resolves well
 *  inside this; the old banner then held for eight seconds. */
const WATCH_MS = 3000;

test('a signed-out visitor on a gallery page sees no error banner', async ({
    page,
}) => {
    await page.goto('/en-US/gallery/Games');

    // Wait for the gallery itself to render, so the effect that reads its
    // classes has had its dependency and run.
    await expect(
        page.getByRole('heading', { name: 'Games' }).first(),
    ).toBeVisible();

    await page.waitForTimeout(WATCH_MS);
    await expect(page.getByTestId('app-banner')).toBeHidden();
});

test('backing out of a gallery leaves no banner behind', async ({ page }) => {
    // The reported path: the failure was raised on the gallery page but seen on
    // the pages the user backed into, which is what made it unreadable.
    //
    // Navigate by clicking, not page.goto — goto loads a fresh document, which
    // discards the banner store and would pass no matter what. Only a
    // client-side navigation carries a banner across pages the way the user saw.
    await page.goto('/en-US/galleries');
    await page.locator('a[href$="/gallery/Games"]').first().click();
    await expect(
        page.getByRole('heading', { name: 'Games' }).first(),
    ).toBeVisible();

    await page.goBack();
    await page.waitForTimeout(WATCH_MS);
    await expect(page.getByTestId('app-banner')).toBeHidden();
});
