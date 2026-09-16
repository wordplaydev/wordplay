import { expect, test } from '../../playwright/fixtures';

/**
 * Bringing a project back from a file (#152).
 *
 * The parsing and the field resets are unit-tested — what can only be checked
 * in a browser is that a real `File` reaches the page, that the project it
 * produces is one a creator can actually open, and that the drop onto an open
 * project asks before it replaces anything.
 *
 * The file is written inline rather than exported first: an export is minutes
 * of work for a test whose subject is the import, and the two formats are held
 * together by `serializeExample`'s own round-trip tests.
 */

/** A project file, in the format the archive writes: glyph, name, the metadata
 *  block, then one source. */
const ProjectFile = [
    '🐈',
    '"Imported Cat"',
    '@locales en-US',
    '=== start',
    "Phrase('meow')",
    '',
].join('\n');

/** Hands the page a file the way a picker would. */
async function choose(
    page: import('@playwright/test').Page,
    content = ProjectFile,
) {
    await page.setInputFiles('input[type="file"]', {
        name: 'cat.wp',
        mimeType: 'text/plain',
        buffer: Buffer.from(content, 'utf8'),
    });
}

test('a project file opens as a project', async ({ page }) => {
    await page.goto('/en-US/projects');
    // The import control is the keyboard path, and the only one a creator can
    // reach without a pointer — so it is what this test drives.
    await page.getByTestId('import-project').waitFor();
    await expect(page.getByTestId('import-project')).toBeEnabled();

    await choose(page);

    // Opening it is the whole point: an import that lands in the list but
    // cannot be opened has not brought anything back.
    await page.waitForURL(/\/project\//, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main.project')).toBeVisible();
});

test('a file that is not a project says so instead of failing silently', async ({
    page,
}) => {
    await page.goto('/en-US/projects');
    await page.getByTestId('import-project').waitFor();

    await choose(page, '');

    // Still on the projects page, with an explanation rather than nothing.
    await expect(page.locator('.feedback').first()).toBeVisible();
    expect(page.url()).toContain('/projects');
});

test('dropping onto an open project asks before replacing it', async ({
    page,
}) => {
    // Get onto a project through the import path, which the first test proves.
    await page.goto('/en-US/projects');
    await page.getByTestId('import-project').waitFor();
    await choose(page);
    await page.waitForURL(/\/project\//, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main.project')).toBeVisible();

    // A synthetic drop, because `dataTransfer.files` has no pointer-event
    // equivalent and Playwright cannot drag from outside the browser.
    await page.evaluate((content) => {
        const data = new DataTransfer();
        data.items.add(new File([content], 'cat.wp', { type: 'text/plain' }));
        const main = document.querySelector('main.project');
        if (main === null) throw new Error('no project to drop on');
        for (const kind of ['dragover', 'drop'])
            main.dispatchEvent(
                new DragEvent(kind, {
                    dataTransfer: data,
                    bubbles: true,
                    cancelable: true,
                }),
            );
    }, ProjectFile);

    // Nothing is replaced until the creator says so. This is the most
    // destructive action in the app, so the question has to be asked.
    await expect(page.getByTestId('confirm-replace')).toBeVisible();
    await page.getByTestId('confirm-replace').click();
    await expect(page.getByTestId('confirm-replace')).toHaveCount(0);
    await expect(page.locator('main.project')).toBeVisible();
});

test('holding a file over an open project never navigates away from it', async ({
    page,
}) => {
    await page.goto('/en-US/projects');
    await page.getByTestId('import-project').waitFor();
    await choose(page);
    await page.waitForURL(/\/project\//, { waitUntil: 'domcontentloaded' });
    // The path, not the whole URL: the app appends its own query as the editor
    // settles, and navigating away is what this is about.
    const where = new URL(page.url()).pathname;

    // `dragover` must be cancelled, or the browser leaves the page to show the
    // dropped file — losing whatever the creator had open, silently.
    const cancelled = await page.evaluate(() => {
        const data = new DataTransfer();
        data.items.add(new File(['x'], 'cat.wp', { type: 'text/plain' }));
        const event = new DragEvent('dragover', {
            dataTransfer: data,
            bubbles: true,
            cancelable: true,
        });
        document.querySelector('main.project')?.dispatchEvent(event);
        return event.defaultPrevented;
    });
    expect(cancelled).toBe(true);
    expect(new URL(page.url()).pathname).toBe(where);
});
