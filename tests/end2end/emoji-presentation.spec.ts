import { expect, test } from '../../playwright/fixtures';
import { grantClipboard } from '../helpers/clipboard';
import { createTestProject } from '../helpers/createProject';

/**
 * Emoji presentation and selection.
 *
 * A creator can ask for a monochrome emoji with U+FE0E, which the tokenizer now
 * preserves (it still strips U+FE0F, which says nothing a bare emoji-default
 * codepoint doesn't already say). Presentation is applied by a CSS class, so
 * these assert the class and that a mono run keeps its selector — that is what
 * makes copying an emoji off the stage preserve its presentation.
 *
 * The selection case covers the measurement bug: a token's text is split across
 * several DOM text nodes once it contains an emoji, and the old measurement read
 * only the first direct-child text node, so an emoji-only token measured zero
 * wide and its selection outline was dropped entirely.
 */

/** One emoji asking for monochrome, one left to the default (color). */
const MONO = '\u{1F600}︎';
const SOURCE = `Phrase('${MONO}\u{1F600}')`;

/** A fresh project whose source is pasted in, so nothing depends on typing
 *  through the editor's delimiter auto-close. */
async function openProbe(page: import('@playwright/test').Page) {
    await grantClipboard(page);
    await createTestProject(page);

    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.evaluate((code) => navigator.clipboard.writeText(code), SOURCE);
    await page.keyboard.press('ControlOrMeta+v');
    // The paste fails silently when it fails at all, so wait on its effect.
    await expect(page.locator('.editor .emoji-mono')).toHaveCount(1);
}

test('a mono emoji renders in the mono face and keeps its selector', async ({
    page,
}) => {
    test.setTimeout(60000);
    await openProbe(page);

    // The selector has to survive into the DOM: stage copy reads the DOM, so a
    // stripped one would be a stripped one on the clipboard.
    await expect(page.locator('.editor .emoji-mono')).toHaveText(MONO);

    // The bare emoji still goes to the color face, with its selector stripped
    // (a trailing U+FE0F makes Safari prefer the system emoji over our font).
    await expect(page.locator('.editor .emoji-color')).toHaveCount(1);
});

test('the stage honors a mono emoji rather than drawing it in color', async ({
    page,
}) => {
    test.setTimeout(60000);
    await openProbe(page);
    await expect(page.locator('.stage .emoji-mono')).toHaveText(MONO);
});

test('selecting an emoji paints a selection outline', async ({ page }) => {
    test.setTimeout(60000);
    await openProbe(page);

    // Place the caret immediately before the emoji run, then select one grapheme.
    const box = await page.locator('.editor .emoji-mono').first().boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + 1, box!.y + box!.height / 2);
    await page.keyboard.press('Shift+ArrowRight');

    const outline = page.locator('svg.highlight.selected').first();
    await expect(outline).toBeVisible();

    // The outline carries HIGHLIGHT_PADDING (48px) on each side, so a dropped
    // zero-width rect still yields a 96px-wide SVG — which is exactly what the
    // old measurement produced. Anything wider means the emoji was measured.
    const one = (await outline.boundingBox())!.width;
    expect(one).toBeGreaterThan(96);

    // Extending over the second emoji has to widen it further.
    await page.keyboard.press('Shift+ArrowRight');
    await expect
        .poll(async () => (await outline.boundingBox())!.width)
        .toBeGreaterThan(one);
});
