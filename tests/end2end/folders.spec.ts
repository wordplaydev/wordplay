import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * Folders on the projects page (#831).
 *
 * The two halves of a folder live in different documents — membership is a
 * field on the project, the folder itself is a creator setting — so the thing
 * worth testing end to end is that they agree: a project filed into a folder
 * is still in it after a reload, and a folder deleted takes its projects to
 * the archive rather than to nowhere.
 */

/** Make a folder and return its section. */
async function newFolder(page: import('@playwright/test').Page) {
    const before = await page.locator('section.folder').count();
    await page.locator('[data-uiid="new-folder"]').click();
    await expect(page.locator('section.folder')).toHaveCount(before + 1);
    return page.locator('section.folder').last();
}

test.describe('project folders', () => {
    test('a project can be filed into a folder with the keyboard alone', async ({
        page,
    }) => {
        test.setTimeout(90000);
        await createTestProject(page);
        await page.goto('/en-US/projects');
        await page.locator('[data-uiid="new-folder"]').waitFor();

        const folder = await newFolder(page);
        // Creating a folder lands focus in its name field, so it can be named
        // without reaching for the pointer.
        await expect(
            page.locator(`[data-id^="folder-name-"]:focus`),
        ).toHaveCount(1);
        await page.keyboard.insertText('Homework');
        await page.keyboard.press('Tab');

        const move = page.locator('[data-uiid^="move-"]').first();
        await move.focus();
        await page.keyboard.press('Enter');
        await expect(move).toHaveAttribute('aria-pressed', 'true');

        // The control's label says where the project would land, and changes
        // as the destination is cycled — that label is what a screen reader
        // reads on each press.
        const before = await move.getAttribute('aria-label');
        await page.keyboard.press('ArrowRight');
        await expect(move).not.toHaveAttribute('aria-label', before ?? '');

        await page.keyboard.press('Enter');
        await expect(folder.locator('[data-testid="preview"]')).toHaveCount(1);

        // The filing has to survive a reload: the project doc and the settings
        // doc that holds the folder are written separately.
        await page.reload();
        await page.locator('[data-uiid="new-folder"]').waitFor();
        await expect(
            page
                .locator('section.folder')
                .filter({ has: page.locator('[data-testid="preview"]') }),
        ).toHaveCount(1);
    });

    test('Escape leaves a move without making one', async ({ page }) => {
        test.setTimeout(90000);
        await createTestProject(page);
        await page.goto('/en-US/projects');
        await newFolder(page);

        const move = page.locator('[data-uiid^="move-"]').first();
        await move.focus();
        await page.keyboard.press('Enter');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Escape');
        await expect(move).toHaveAttribute('aria-pressed', 'false');
        await expect(
            page.locator('section.folder [data-testid="preview"]'),
        ).toHaveCount(0);
    });

    test('a collapsed folder still shows what is in it', async ({ page }) => {
        test.setTimeout(90000);
        await createTestProject(page);
        await page.goto('/en-US/projects');
        const folder = await newFolder(page);

        const tile = page.locator('[data-folder="none"] .project').first();
        await tile.click({ position: { x: 4, y: 4 } });
        await page.keyboard.press('ArrowUp');
        await expect(folder.locator('[data-testid="preview"]')).toHaveCount(1);

        const disclosure = folder.locator('.header button').first();
        await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
        await disclosure.click();
        await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
        // Collapsed shows previews rather than nothing, so a creator can
        // recognize the contents without opening it.
        await expect(
            folder.locator('.peek [data-testid="preview"]'),
        ).toHaveCount(1);
    });

    test('search flattens folders and disables organizing', async ({
        page,
    }) => {
        test.setTimeout(90000);
        await createTestProject(page);
        await page.goto('/en-US/projects');
        const folder = await newFolder(page);
        await page.keyboard.insertText('Homework');
        await page.keyboard.press('Tab');

        const tile = page.locator('[data-folder="none"] .project').first();
        await tile.click({ position: { x: 4, y: 4 } });
        await page.keyboard.press('ArrowUp');
        await expect(folder.locator('[data-testid="preview"]')).toHaveCount(1);

        // A match hidden inside a folder would make search lie, so results are
        // shown flat, labeled with the folder they live in.
        await page.getByTestId('project-search').fill('Untitled');
        await page.waitForTimeout(600);
        await expect(page.locator('section.folder')).toHaveCount(0);

        // And organizing is off while the page is filtered: a destructive
        // control must never act on state the creator can't see.
        await expect(page.locator('[data-uiid="new-folder"]')).toHaveAttribute(
            'aria-disabled',
            'true',
        );
        await expect(
            page.locator('[data-testid="delete-folder"]'),
        ).toHaveAttribute('aria-disabled', 'true');
    });

    test('deleting a folder archives what is in it rather than destroying it', async ({
        page,
    }) => {
        test.setTimeout(90000);
        await createTestProject(page);
        await page.goto('/en-US/projects');
        const folder = await newFolder(page);
        await page.keyboard.insertText('Homework');
        await page.keyboard.press('Tab');

        const tile = page.locator('[data-folder="none"] .project').first();
        await tile.click({ position: { x: 4, y: 4 } });
        await page.keyboard.press('ArrowUp');
        await expect(folder.locator('[data-testid="preview"]')).toHaveCount(1);

        // Delete is only offered for the chosen folder, and clicking one is
        // what chooses it.
        const remove = page.locator('[data-testid="delete-folder"]');
        await folder.locator('.header').click({ position: { x: 200, y: 8 } });
        await expect(folder).toHaveAttribute('aria-current', 'true');
        await expect(remove).toHaveAttribute('aria-disabled', 'false');
        await remove.click();
        await page.locator('[data-testid="delete-folder-confirm"]').click();

        await expect(page.locator('section.folder')).toHaveCount(0);
        // The project is archived, not gone: the archived section names it.
        await expect(page.getByText(/archive/i).first()).toBeVisible();
    });
});
