import type { Page } from '@playwright/test';
import { idFromURL } from './idFromURL';

/**
 * Create a new gallery via the /galleries page UI. The signed-in user becomes
 * the gallery's curator. Returns the new gallery's ID, read from the URL after
 * the create button redirects to the new gallery's page.
 *
 * Optionally sets a gallery name so multi-gallery tests can disambiguate
 * dropdown entries.
 */
export async function createTestGallery(
    page: Page,
    name?: string,
): Promise<string> {
    await page.goto('/en-US/galleries');
    await page.getByRole('button', { name: 'new gallery' }).click();
    await page.waitForURL(/\/gallery\/[^/]+$/);
    const galleryID = idFromURL(page.url());

    if (name !== undefined) {
        const nameField = page.locator('#gallery-name');
        await nameField.waitFor();
        await nameField.fill(name);
        // The name field's `done` handler fires on blur; tab away so the write
        // happens before the test proceeds.
        await nameField.press('Tab');
    }

    return galleryID;
}
