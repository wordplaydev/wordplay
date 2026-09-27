import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * The add-source dialog turns a picture and a pasted table into code (#559). Both end the same
 * way: a new source the main program borrows, with a tile of its own. One test for both, since
 * a page load is most of what an end-to-end test costs.
 */
test('a picture and a pasted table each become a source main borrows', async ({
    page,
}) => {
    test.setTimeout(60000);
    await createTestProject(page);

    const dialog = page.getByRole('dialog');
    const main = page.getByTestId('editor').first();

    // A picture from this device.
    await page.locator('[data-uiid="addSource"]').first().click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('tab').nth(1).click();
    await dialog
        .locator('input[type="file"]')
        .setInputFiles('static/icons/favicon-32x32.png');
    const addColors = dialog.getByRole('button', {
        name: 'add these colors as a file of code',
    });
    await expect(addColors).toBeEnabled({ timeout: 15000 });
    await addColors.click();
    await expect(dialog).toBeHidden();
    await expect(main).toContainText('↓ colors');
    // The tile toggle draws the picture in place of the file icon.
    await expect(
        page
            .getByRole('button', { name: /source colors/ })
            .first()
            .locator('canvas.thumbnail'),
    ).toBeVisible({ timeout: 15000 });

    // A table pasted as comma-separated values.
    await page.locator('[data-uiid="addSource"]').first().click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('tab').nth(2).click();
    await dialog.locator('textarea').fill('name,age\nkim,12\nlee,13');
    const addRows = dialog.getByRole('button', {
        name: 'add these rows as a file of code',
    });
    await addRows.click();
    await expect(dialog).toBeHidden();
    await expect(main).toContainText('↓ rows');
    await expect(
        page.getByRole('button', { name: /source rows/ }).first(),
    ).toBeVisible();
});
