import { expect, test } from '../../playwright/fixtures';
import { grantClipboard } from '../helpers/clipboard';
import { createTestProject } from '../helpers/createProject';

/**
 * A source can be made by something that knows nothing about tiles. A program's
 * `Source` output writes one from inside the evaluator, and only `ProjectView`
 * knows about the tiles that show a file. For as long as the two didn't talk, the
 * file existed in the project with no way into it until the page was reloaded,
 * which a creator reads as the program having done nothing.
 */
test('a source a program writes gets a tile without a reload', async ({
    page,
}) => {
    test.setTimeout(60000);

    await grantClipboard(page);
    await createTestProject(page);

    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.evaluate(() =>
        navigator.clipboard.writeText('Source("saved" 5)'),
    );
    await page.keyboard.press('ControlOrMeta+v');

    // By name rather than position: the source toggle's accessible name is its
    // tip, and the tip names the source.
    await expect(
        page.getByRole('button', { name: /source saved/ }).first(),
        'the source the program wrote needs a tile of its own',
    ).toBeVisible({ timeout: 15000 });
});
