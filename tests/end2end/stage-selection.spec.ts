import { expect, test } from '../../playwright/fixtures';
import { grantClipboard } from '../helpers/clipboard';
import { createTestProject } from '../helpers/createProject';

/**
 * Selecting output text.
 *
 * The stage is a drag surface — panning, and moving output while paused — and a
 * drag can't both pan and select, since the browser decides which at mousedown.
 * So text is selectable only where there is no gesture to compete with: on a
 * read-only stage (the whole drag/pan block is gated on `editable`), and in
 * non-stage value output, which has no gestures at all.
 */

/** Drag across an element and return whatever the browser selected. */
async function dragAcross(
    page: import('@playwright/test').Page,
    selector: string,
) {
    const box = await page.locator(selector).first().boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + 1, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width - 1, box!.y + box!.height / 2, {
        steps: 12,
    });
    await page.mouse.up();
    return page.evaluate(() => window.getSelection()?.toString() ?? '');
}

async function pasteSource(
    page: import('@playwright/test').Page,
    code: string,
) {
    await grantClipboard(page);
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.evaluate((c) => navigator.clipboard.writeText(c), code);
    await page.keyboard.press('ControlOrMeta+v');
}

test('an editable stage stays unselectable, so a drag still pans', async ({
    page,
}) => {
    test.setTimeout(60000);
    await pasteSource(page, "Phrase('hello world')");
    await expect(page.locator('.output.phrase')).toHaveText('hello world');

    await expect(page.locator('.stage')).not.toHaveClass(/readonly/);
    expect(await dragAcross(page, '.output.phrase')).toBe('');
});

test('a read-only stage lets a drag select its phrase text', async ({
    page,
}) => {
    test.setTimeout(60000);
    await pasteSource(page, "Phrase('hello world')");
    await expect(page.locator('.output.phrase')).toHaveText('hello world');

    // Switch modes the way a creator does rather than reloading: a reload races
    // the paste reaching the database, and the reloaded project comes back blank.
    // ProjectModes is ['edit', 'debug', 'play'], so play is the third radio.
    const modes = page.locator(
        '[data-uiid="modeSwitcher"] button[role="radio"]',
    );
    await modes.nth(2).click();
    await expect(modes.nth(2)).toHaveAttribute('aria-checked', 'true');

    // Play mode is not editable, so the stage takes no drag of its own.
    await expect(page.locator('.stage').first()).toHaveClass(/readonly/);
    expect(await dragAcross(page, '.output.phrase')).toContain('hello');
});

test('value output that is not a stage is always selectable', async ({
    page,
}) => {
    test.setTimeout(60000);
    await pasteSource(page, '1 + 2');
    // A number is not a stage, so it renders through ValueView instead.
    await expect(page.locator('.message .value').first()).toContainText('3');
    expect(await dragAcross(page, '.message .value')).toContain('3');
});
