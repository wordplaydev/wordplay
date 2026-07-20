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
