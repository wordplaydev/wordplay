import { expect, test } from '@playwright/test';
import { grantClipboard } from '../helpers/clipboard';
import { createTestProject } from '../helpers/createProject';

/**
 * Vertical caret movement must never silently do nothing. The rendered row
 * model is built from the DOM and only knows what it drew, so wherever it
 * disagrees with the caret's own position universe — the end of a program that
 * ends in a delimiter, a row outside a virtualized window, an unmeasurable
 * caret — a source-line step takes over. These cover what the unit tests can't:
 * the unit suite has no DOM, so every rectangle there is zero.
 */

/** The focused editor's hidden mirror field, which follows the caret. */
function mirror(page: import('@playwright/test').Page) {
    return page
        .locator('.keyboard-input')
        .first()
        .evaluate((el) => {
            const field = el as HTMLTextAreaElement;
            return { value: field.value, start: field.selectionStart };
        });
}

/** A project holding `code`, with the editor focused. */
async function withCode(page: import('@playwright/test').Page, code: string) {
    await grantClipboard(page);
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    // Paste rather than type: the editor's delimiter auto-close mangles typed
    // brackets and quotes.
    await page.evaluate(
        (source) => navigator.clipboard.writeText(source),
        code,
    );
    await page.keyboard.press('ControlOrMeta+v');
    await expect
        .poll(async () => (await mirror(page)).value, {
            message: 'source did not load into the editor',
        })
        .toBe(code);
}

async function useBlocksMode(page: import('@playwright/test').Page) {
    await page
        .locator(
            '[data-uiid="textBlocksToggle"] button[role="radio"][aria-checked="false"]',
        )
        .click();
    await page.locator('.keyboard-input').first().focus();
}

const PHRASES = "Phrase('a')\nPhrase('b')\nPhrase('c')";

test('blocks mode moves up from the end of a program ending in a delimiter', async ({
    page,
}) => {
    // The reported failure. Every token spanning the last position is a closing
    // delimiter, which the row model used to leave out — so the caret sat in no
    // row and Up refused, though there were two rows above it.
    await withCode(page, PHRASES);
    await useBlocksMode(page);

    // PageDown is "go to the end of the source".
    await page.keyboard.press('PageDown');
    await expect
        .poll(async () => (await mirror(page)).start)
        .toBe(PHRASES.length);

    await page.keyboard.press('ArrowUp');
    // It moved, and onto the line above rather than to the start of the source.
    await expect
        .poll(async () => (await mirror(page)).start)
        .toBeLessThan(PHRASES.length);
    const after = (await mirror(page)).start;
    expect(after).toBeGreaterThan(PHRASES.indexOf('\n'));
});

test('text mode moves up from the end of the same program', async ({
    page,
}) => {
    await withCode(page, PHRASES);
    await page.keyboard.press('PageDown');
    await page.keyboard.press('ArrowUp');
    await expect
        .poll(async () => (await mirror(page)).start)
        .toBeLessThan(PHRASES.length);
});

test('up on the first line goes to the start of the source', async ({
    page,
}) => {
    await withCode(page, PHRASES);
    // Land mid-way along the first line.
    await page.keyboard.press('PageUp');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    expect((await mirror(page)).start).toBeGreaterThan(0);

    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await mirror(page)).start).toBe(0);
});

test('down on the last line goes to the end of the source', async ({
    page,
}) => {
    await withCode(page, PHRASES);
    await page.keyboard.press('PageDown');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
    expect((await mirror(page)).start).toBeLessThan(PHRASES.length);

    await page.keyboard.press('ArrowDown');
    await expect
        .poll(async () => (await mirror(page)).start)
        .toBe(PHRASES.length);
});

test('a move with nowhere left to go says so', async ({ page }) => {
    // Silence after a keystroke is indistinguishable from a broken app, so the
    // one case where movement genuinely can't happen is announced.
    await withCode(page, PHRASES);
    await page.keyboard.press('PageUp');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('.announcements.immediate')).toContainText(
        "Can't move any further",
    );
});
