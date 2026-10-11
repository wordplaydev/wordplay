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

/**
 * The showcase's code is editable in place: an edit re-runs the stage, and
 * revert puts the example back. Nothing is saved, so this needs no project.
 */
test('editing a showcase example re-runs it and reverts', async ({ page }) => {
    await page.goto('/');
    await page.locator('.stage .play button').click();

    // The first example is a Phrase reading 'hello!'.
    const editor = page.locator('.showcase .source .editor');
    await expect(editor).toBeVisible();
    await editor.locator('.token-view', { hasText: 'hello!' }).first().click();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('xyz');

    const phrase = page.locator('.showcase .output.phrase');
    await expect(phrase).toContainText('xyz');

    await page.locator('.showcase .restart button').first().click();
    await expect(phrase).not.toContainText('xyz');
    await expect(phrase).toContainText('hello!');
});

/**
 * Blocks mode edits through menus, which only a project used to show; the
 * showcase hosts its own, so choosing from one changes the example.
 */
test('a showcase menu opens and edits the example', async ({ page }) => {
    await page.goto('/');
    await page.locator('.stage .play button').click();
    const source = page.locator('.showcase .source');
    await expect(source.locator('.editor')).toBeVisible();
    await page.locator('.showcase .mode').getByRole('radio').nth(1).click();

    const before = await source.innerText();
    await source.locator('.trigger[data-field="language"]').first().click();
    const items = page.locator('[role=menu] [role=menuitem]');
    await expect(items.first()).toBeVisible();
    await items.first().click();
    await expect(page.locator('[role=menu]')).toHaveCount(0);
    await expect.poll(() => source.innerText()).not.toBe(before);
});
