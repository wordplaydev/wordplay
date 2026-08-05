import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * The palette is the only thing on screen that explains an output selection, and the
 * editor draws that selection as an underline under the selected output's code. So the
 * selection must not outlive the palette: a stale one underlines code with nothing to
 * explain it (#1262).
 *
 * Clearing used to live in ProjectView.setMode, which covered only an explicit collapse
 * gesture; it now lives in Palette.svelte's unmount, which covers every route that hides
 * the tile. This test guards the gesture that both implementations share — the other
 * routes (play mode, fullscreen, one-tile arrangements) unmount the same component.
 */
test('collapsing the palette clears the output selection underline', async ({
    page,
}) => {
    test.setTimeout(60000);

    await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);

    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');

    // Paste rather than type: the editor's delimiter auto-close mangles typed
    // brackets and quotes.
    const code = "Phrase('hi')";
    await page.evaluate(
        (source) => navigator.clipboard.writeText(source),
        code,
    );
    await page.keyboard.press('ControlOrMeta+v');
    await expect
        .poll(async () => (await editor.textContent()) ?? '', {
            message: 'source did not load into the editor',
        })
        .toContain('Phrase');

    // The `output` highlight is the selection underline (Highlights.ts) — an SVG
    // carrying both classes (Highlight.svelte).
    const underline = page.locator('.highlight.underline.output');
    const paletteToggle = page.locator('[data-uiid="paletteExpand"]');

    // Open the palette. Its caret effect selects the output the caret sits inside,
    // so the underline appears — this is the state the underline is meant to explain.
    await paletteToggle.click();
    // Click the `Phrase` token itself, not the editor container: a container click
    // lands past the code and puts the caret on the end token, whose ancestors don't
    // include the Phrase, so nothing gets selected.
    await editor.getByText('Phrase', { exact: true }).first().click();
    await expect(underline.first()).toBeVisible({ timeout: 8000 });

    // Collapse it again: the palette is gone, so the selection must go with it.
    await paletteToggle.click();
    await expect(underline).toHaveCount(0, { timeout: 8000 });
});
