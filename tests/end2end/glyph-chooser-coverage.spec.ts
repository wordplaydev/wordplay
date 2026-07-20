import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * The glyph chooser must not offer codepoints no bundled font can draw
 * (they'd render as tofu). Uses the editor's character inserter, then reads
 * the rendered glyph grid.
 */

/** Open the editor's glyph chooser and select a script filter. */
async function openChooserWithScript(
    page: import('@playwright/test').Page,
    scriptCode: string,
) {
    await page.locator('textarea.keyboard-input').first().focus();
    await page.getByText('😊').first().click();
    await page
        .locator(`select:has(option[value="${scriptCode}"])`)
        .selectOption(scriptCode);
}

test('Han view shows only renderable glyphs (no compatibility ideographs)', async ({
    page,
}) => {
    await createTestProject(page);
    await openChooserWithScript(page, 'Hani');

    // Collect every glyph the grid renders.
    const glyphs = await page
        .locator('.emojis .emoji span.emoji')
        .allInnerTexts();
    expect(glyphs.length).toBeGreaterThan(0);

    // A unified ideograph every Noto CJK font has is still offered.
    expect(glyphs).toContain(String.fromCodePoint(0x4e00)); // 一
    // Specific codepoints no Noto font contains must be absent: a genuine
    // compatibility ideograph (U+FA0D) and a compatibility supplement char
    // (U+2F800). These would render as tofu.
    expect(glyphs).not.toContain(String.fromCodePoint(0xfa0d));
    expect(glyphs).not.toContain(String.fromCodePoint(0x2f800));
});

test('Arabic view excludes unassigned presentation forms (no glyph)', async ({
    page,
}) => {
    await createTestProject(page);
    await openChooserWithScript(page, 'Arab');

    const glyphs = await page
        .locator('.emojis .emoji span.emoji')
        .allInnerTexts();
    expect(glyphs.length).toBeGreaterThan(0);

    // A common Arabic letter is offered.
    expect(glyphs).toContain(String.fromCodePoint(0x0639)); // ع
    // Noto Sans Arabic's slice declares the whole Arabic Presentation Forms-A
    // block but lacks glyphs for unassigned codepoints in it — the renderable
    // set (real cmap) must exclude them so they don't render as tofu.
    expect(glyphs).not.toContain(String.fromCodePoint(0xfbc3));
    expect(glyphs).not.toContain(String.fromCodePoint(0x10ec5)); // Arabic Extended-C
});

test('un-released scripts are absent from the script dropdown', async ({
    page,
}) => {
    await createTestProject(page);
    await page.locator('textarea.keyboard-input').first().focus();
    await page.getByText('😊').first().click();

    // Garay (Gara) has no released Noto font, so every glyph would tofu — it
    // must not be offered as a script filter at all.
    await expect(page.locator('select option[value="Gara"]')).toHaveCount(0);
    // A covered script is still offered.
    await expect(page.locator('select option[value="Hani"]')).toHaveCount(1);
});
