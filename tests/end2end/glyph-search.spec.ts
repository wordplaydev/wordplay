import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * Non-emoji glyphs (Han, symbols, letters) are now searchable by English name
 * and Unihan definition/pinyin, tooltipped, and the huge browse grids are
 * capped so they stay responsive. A non-Chinese speaker can find 水 by typing
 * "water".
 */

async function openChooser(page: import('@playwright/test').Page) {
    await createTestProject(page);
    await page.locator('textarea.keyboard-input').first().focus();
    await page.getByText('😊').first().click();
}

test('a Han character is findable by its English meaning', async ({ page }) => {
    await openChooser(page);
    await page.locator('#glyph-search').fill('water');

    // 水 (U+6C34) should appear among the search results.
    await expect
        .poll(async () =>
            (
                await page.locator('.emojis .emoji span.emoji').allInnerTexts()
            ).includes('水'),
        )
        .toBe(true);
});

test('a Han character is findable by toneless pinyin', async ({ page }) => {
    await openChooser(page);
    await page.locator('#glyph-search').fill('shui');
    await expect
        .poll(async () =>
            (
                await page.locator('.emojis .emoji span.emoji').allInnerTexts()
            ).includes('水'),
        )
        .toBe(true);
});

test('search is global — it finds emoji even while a script filter is active', async ({
    page,
}) => {
    await openChooser(page);
    await page.locator('select:has(option[value="Hani"])').selectOption('Hani');
    await page.locator('#glyph-search').fill('rowing');

    // A rowing emoji (not Han) should appear despite the Han filter.
    await expect
        .poll(async () =>
            (
                await page.locator('.emojis .emoji span.emoji').allInnerTexts()
            ).some((g) => /\p{Emoji_Presentation}/u.test(g)),
        )
        .toBe(true);
});

test('emoji rank first in search results', async ({ page }) => {
    await openChooser(page);
    await page.locator('#glyph-search').fill('water');

    // "water" matches emoji (💧🌊) and Han (水); the first result is an emoji.
    await expect
        .poll(async () => {
            const glyphs = await page
                .locator('.emojis .emoji span.emoji')
                .allInnerTexts();
            return glyphs.length > 0
                ? /\p{Emoji_Presentation}/u.test(glyphs[0])
                : null;
        })
        .toBe(true);
});

test('the Han browse grid is capped with a "search to find more" hint', async ({
    page,
}) => {
    await openChooser(page);
    await page.locator('select:has(option[value="Hani"])').selectOption('Hani');

    // The grid renders a capped page, not tens of thousands of glyphs.
    const count = await page.locator('.emojis .emoji span.emoji').count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(500);
    // And a hint points to search for the rest.
    await expect(page.locator('.emojis .more')).toBeVisible();
});

/**
 * Typing into the search field used to expand the chooser by swapping between
 * two OverflowToolbar instances, which remounted the pinned field and dropped
 * focus after the first character. `.fill()` sets a value in one shot and never
 * reproduced it, so this types key by key.
 */
test('the search field keeps focus while typing character by character', async ({
    page,
}) => {
    await createTestProject(page);
    await page.locator('textarea.keyboard-input').first().focus();

    // Deliberately NOT via openChooser: typing into the collapsed row is what
    // fires the auto-expand effect on the first character.
    const field = page.locator('#glyph-search');
    await field.click();
    await field.pressSequentially('water', { delay: 50 });

    await expect(field).toBeFocused();
    await expect(field).toHaveValue('water');
    await expect(page.locator('.emojis')).toBeVisible();
});

/**
 * The color/monochrome choice belongs to the chooser, not the toolbar row: it
 * means nothing until there are glyphs to pick, so it appears with them.
 */
test('the presentation mode appears only once the chooser is open', async ({
    page,
}) => {
    await createTestProject(page);
    await page.locator('textarea.keyboard-input').first().focus();

    const mode = page.locator('[data-uiid="presentation"]');
    await expect(mode).toHaveCount(0);

    await page.getByText('😊').first().click();
    await expect(mode).toHaveCount(1);

    // Each option is drawn in the presentation it selects — color (U+FE0F) and
    // monochrome (U+FE0E) — so the control shows its own effect.
    const options = mode.locator('button[role="radio"]');
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toHaveText('🎨\uFE0F');
    await expect(options.nth(1)).toHaveText('🎨\uFE0E');
    await expect(options.nth(0)).toHaveAttribute('aria-checked', 'true');
});

test('picking in monochrome mode inserts an emoji that renders monochrome', async ({
    page,
}) => {
    test.setTimeout(60000);
    await createTestProject(page);
    await page.locator('textarea.keyboard-input').first().focus();
    await page.getByText('😊').first().click();

    await page
        .locator('[data-uiid="presentation"] button[role="radio"]')
        .nth(1)
        .click();
    // The grid previews the pick, so it switches faces with the mode.
    await expect(page.locator('.emojis span.emoji.mono').first()).toBeVisible();

    await page.locator('#glyph-search').pressSequentially('grinning');
    await page.locator('.emojis .emoji button').first().click();

    await expect(page.locator('.editor .emoji-mono')).toHaveCount(1);
});
