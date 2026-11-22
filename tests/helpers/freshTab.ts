import { expect, type Page } from '@playwright/test';

/**
 * Continue in a new tab of the same context, closing this one once everything
 * it was saving has reached the cloud.
 *
 * Playwright's Linux WebKit (WPE) sometimes aborts in JavaScriptCore's garbage
 * collector when a tab that has run the character editor loads another
 * character page (November 2026: 20-50% of such loads; never in a fresh tab,
 * never in Apple's WebKit, still in Playwright's newest build). A new tab gets
 * a fresh content process. Navigating through a cross-origin page also swaps
 * processes but keeps the old page alive in the back/forward cache, where it
 * stalled later saves, so the old tab is closed instead. Remove once the Linux
 * WebKit nightly survives without it.
 */
export async function continueInFreshTab(page: Page): Promise<Page> {
    // Closing a tab abandons its unsent writes, so wait for the save chip.
    await expect(page.getByTestId('save-status')).toHaveText(/\bsaved$/, {
        timeout: 15_000,
    });
    const next = await page.context().newPage();
    await page.close();
    return next;
}
