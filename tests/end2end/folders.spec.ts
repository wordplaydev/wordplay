import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';
import { getTestFirestore, waitForDocumentUpdate } from '../helpers/firestore';

/**
 * Folders on the projects page (#831).
 *
 * The two halves of a folder live in different documents — membership is a
 * field on the project, the folder itself is a creator setting — so the thing
 * worth testing end to end is that they agree: a project filed into a folder
 * is still in it after a reload, and a folder deleted takes its projects to
 * the archive rather than to nowhere.
 */

/**
 * Create a project and land on the projects page with it listed, returning the
 * creator's uid (the project's owner).
 *
 * `createTestProject` returns as soon as the editor is interactive, which is
 * before the project has been registered for the projects list — navigating
 * away inside that window leaves it unlisted indefinitely, not just briefly.
 * Waiting for its document to reach the cloud closes that window.
 */
async function createListedProject(
    page: import('@playwright/test').Page,
): Promise<string> {
    const id = await createTestProject(page);
    const project = await waitForDocumentUpdate(
        page,
        'projects',
        id,
        (data) => typeof data?.owner === 'string',
    );
    const owner: unknown = project.owner;
    if (typeof owner !== 'string') throw new Error('project has no owner');
    await page.goto('/en-US/projects');
    await page.locator('[data-uiid="new-folder"]').waitFor();
    await expect(
        page.locator('[data-folder="none"] .project').first(),
    ).toBeVisible();
    return owner;
}

/** Make a folder and return its section. */
async function newFolder(page: import('@playwright/test').Page) {
    const folders = page.locator('section.folder');
    const ids = () =>
        folders.evaluateAll((nodes) =>
            nodes.map((node) => node.getAttribute('data-folder')),
        );
    const before = await ids();
    await page.locator('[data-uiid="new-folder"]').click();
    await expect(folders).toHaveCount(before.length + 1);
    // Folders are sorted, and a new one takes the default name, so the newest
    // is not reliably last once a test file has made several. Find it by the
    // id that just appeared rather than by position.
    const added = (await ids()).find(
        (id) => id !== null && !before.includes(id),
    );
    expect(added).toBeTruthy();
    return page.locator(`section.folder[data-folder="${added}"]`);
}

/**
 * Choose the first loose project, move it up one destination, and return the
 * folder it landed in.
 *
 * Up moves to the destination immediately above, and the destinations are the
 * folders in the order they are drawn followed by the top level — so a loose
 * project lands in the *last* folder, which is not necessarily the one a test
 * just made: every test in this file runs as the same worker account, and the
 * folders earlier ones created are still there.
 */
async function fileFirstProject(page: import('@playwright/test').Page) {
    const tile = page.locator('[data-folder="none"] .project').first();
    await tile.click({ position: { x: 4, y: 4 } });
    await expect(tile).toHaveAttribute('aria-current', 'true');
    await page.keyboard.press('ArrowUp');
    const landed = page.locator('section.folder').last();
    await expect(
        landed.locator('[data-testid="preview"]').first(),
    ).toBeVisible();
    return landed;
}

test.describe('project folders', () => {
    test('a project can be filed into a folder with the keyboard alone', async ({
        page,
    }) => {
        test.setTimeout(90000);
        const owner = await createListedProject(page);

        const folder = await newFolder(page);
        const folderID = await folder.getAttribute('data-folder');
        expect(folderID).toBeTruthy();
        // Creating a folder lands focus in its name field, so it can be named
        // without reaching for the pointer.
        await expect(
            page.locator(`[data-id^="folder-name-"]:focus`),
        ).toHaveCount(1);
        await page.keyboard.insertText('Homework');
        await page.keyboard.press('Tab');

        // Clicking a project chooses it; the folder is drawn above the
        // top-level projects, so up moves into it — the arrow points the way
        // the project travels on screen.
        const tile = page.locator('[data-folder="none"] .project').first();
        await tile.click({ position: { x: 4, y: 4 } });
        await expect(tile).toHaveAttribute('aria-current', 'true');
        await page.keyboard.press('ArrowUp');
        await expect(
            folder.locator('[data-testid="preview"]').first(),
        ).toBeVisible();

        // The filing has to survive a reload: the project doc and the settings
        // doc that holds the folder are written separately. Wait for both to
        // land first — reloading straight away tests the write queue, not
        // persistence.
        await expect
            .poll(
                async () =>
                    (
                        await getTestFirestore()
                            .collection('projects')
                            .where('folder', '==', folderID)
                            .limit(1)
                            .get()
                    ).size,
                { timeout: 15000 },
            )
            .toBe(1);
        await waitForDocumentUpdate(page, 'creators', owner, (data) => {
            const folders: unknown = data?.projectFolders;
            return (
                typeof folders === 'object' &&
                folders !== null &&
                folderID !== null &&
                folderID in folders
            );
        });
        await page.reload();
        await page.locator('[data-uiid="new-folder"]').waitFor();
        await expect(
            page
                .locator(`section.folder[data-folder="${folderID}"]`)
                .locator('[data-testid="preview"]')
                .first(),
        ).toBeVisible();
    });

    test('organizing projects into folders', async ({ page }) => {
        test.setTimeout(120000);
        await createListedProject(page);
        await newFolder(page);
        await page.keyboard.insertText('Homework');
        await page.keyboard.press('Tab');

        await test.step('Escape lets go of the project', async () => {
            const tile = page.locator('[data-folder="none"] .project').first();
            await tile.click({ position: { x: 4, y: 4 } });
            await expect(tile).toHaveAttribute('aria-current', 'true');
            await page.keyboard.press('Escape');
            await expect(tile).not.toHaveAttribute('aria-current', 'true');
        });

        await test.step('down moves a project back out of the folder above it', async () => {
            const folder = await fileFirstProject(page);
            // Assert the delta, not emptiness: the folder a project lands in may
            // already hold one filed by an earlier test in this file.
            const previews = folder.locator('[data-testid="preview"]');
            const before = await previews.count();
            await page.keyboard.press('ArrowDown');
            await expect(previews).toHaveCount(before - 1);
            // Let go of it, so the next step chooses a project afresh.
            await page.keyboard.press('Escape');
        });

        const folder =
            await test.step('a collapsed folder still shows what is in it', async () => {
                const folder = await fileFirstProject(page);

                const disclosure = folder.locator('.header button').first();
                await expect(disclosure).toHaveAttribute(
                    'aria-expanded',
                    'true',
                );
                await disclosure.click();
                await expect(disclosure).toHaveAttribute(
                    'aria-expanded',
                    'false',
                );
                // Collapsed shows previews rather than nothing, so a creator can
                // recognize the contents without opening it.
                await expect(
                    folder.locator('.peek [data-testid="preview"]').first(),
                ).toBeVisible();
                // Collapsed state is a setting on this worker's account, so open
                // it again rather than leave later tests a collapsed last folder.
                await disclosure.click();
                await expect(disclosure).toHaveAttribute(
                    'aria-expanded',
                    'true',
                );
                return folder;
            });

        await test.step('search flattens folders and disables organizing', async () => {
            // A match hidden inside a folder would make search lie, so results are
            // shown flat, labeled with the folder they live in.
            const search = page.getByTestId('project-search');
            await search.fill('Untitled');
            await expect(page.locator('section.folder')).toHaveCount(0);

            // And organizing is off while the page is filtered: a destructive
            // control must never act on state the creator can't see.
            await expect(
                page.locator('[data-uiid="new-folder"]'),
            ).toHaveAttribute('aria-disabled', 'true');
            await expect(
                page.locator('[data-testid="delete-folder"]'),
            ).toHaveAttribute('aria-disabled', 'true');

            await search.fill('');
            await expect(folder).toBeVisible();
        });

        await test.step('deleting a folder archives what is in it rather than destroying it', async () => {
            // Delete is only offered for the chosen folder, and clicking one is
            // what chooses it.
            const remove = page.locator('[data-testid="delete-folder"]');
            const before = await page.locator('section.folder').count();
            await folder
                .locator('.header')
                .click({ position: { x: 200, y: 8 } });
            await expect(folder).toHaveAttribute('aria-current', 'true');
            await expect(remove).toHaveAttribute('aria-disabled', 'false');
            await remove.click();
            await page.locator('[data-testid="delete-folder-confirm"]').click();

            await expect(page.locator('section.folder')).toHaveCount(
                before - 1,
            );
            // The project is archived, not gone: the archived section names it.
            await expect(page.getByText(/archive/i).first()).toBeVisible();
        });
    });
});
