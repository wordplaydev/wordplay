import { expect, test } from '../../playwright/fixtures';

/**
 * Clicking a selectable phrase on the landing page's Choice example picks it.
 * The click lands on a span inside the phrase (its language run), not the
 * phrase itself, which silently stopped every pointer selection once.
 */
test('clicking a selectable phrase reaches Choice', async ({ page }) => {
    await page.goto('/');
    // The Choice example is the fifth button in the showcase's tab list.
    await page.locator('.stage .play button').click();
    await page.locator('.showcase [role=tab]').nth(4).click();

    const apple = page.locator('.output.phrase[data-selectable="true"]', {
        hasText: '🍎',
    });
    await expect(apple).toBeVisible();
    // Until something is picked, the shown phrase is a question mark.
    const shown = page.locator('.output.phrase', { hasText: '?' });
    await expect(shown).toHaveCount(1);

    await apple.click();
    await expect(shown).toHaveCount(0);
    await expect(
        page.locator('.output.phrase:not([data-selectable="true"])', {
            hasText: '🍎',
        }),
    ).toHaveCount(1);
});
