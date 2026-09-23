import { expect, type Page } from '@playwright/test';

/**
 * Add an empty source file to the open project.
 *
 * The `+` opens a dialog offering the four ways of making a file (#559), so a
 * test that wants an empty one has to say which. By `data-uiid` rather than by
 * the button's name, since one caller runs the interface in Hebrew.
 */
export default async function addBlankSource(page: Page) {
    await page.locator('[data-uiid="addSource"]').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-uiid="addBlankSource"]').click();
    await expect(dialog).toBeHidden();
}
