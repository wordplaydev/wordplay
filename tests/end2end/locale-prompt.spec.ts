import { expect, test } from '@playwright/test';

/**
 * The first-run language prompt (#1256).
 *
 * The app boots in English for everyone, so a visitor who can't read English has no way
 * to know that the English word in the footer is the way out. These cover both halves of
 * that: that the prompt reaches the people it's for, and — just as important — that it
 * stays out of everyone else's way, since a modal that opens by itself is only tolerable
 * if it opens once.
 *
 * Every context here starts with empty storage and no account, which is what makes the
 * prompt eligible at all; `storageState` is set explicitly so these don't inherit the
 * signed-in worker fixture the rest of the suite uses.
 */

const Empty = { cookies: [], origins: [] };
const dialog = (page: import('@playwright/test').Page) =>
    page.locator('dialog[open]');

test.use({ storageState: Empty });

/** The prompt waits on authentication resolving to signed-out, so it appears a beat
 *  after load rather than with the first paint. */
async function settle(page: import('@playwright/test').Page) {
    await expect(page.getByRole('heading').first()).toBeVisible({
        timeout: 15000,
    });
    await page.waitForTimeout(3000);
}

test('greets a first-time visitor in every language', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    await expect(dialog(page)).toBeVisible();
    // The invitation appears in every language that has one, not just English — that
    // is the entire point, so assert on the count rather than on one phrase.
    const phrases = dialog(page).locator('.phrase');
    expect(await phrases.count()).toBeGreaterThan(20);
    await expect(phrases.filter({ hasText: 'Choose a language' })).toHaveCount(
        1,
    );
});

test('choosing a language switches to it, closes, and never asks again', async ({
    page,
}) => {
    await page.goto('/');
    await settle(page);

    await dialog(page)
        .locator('.supported .option button')
        .filter({ hasText: 'español' })
        .first()
        .click();

    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(/\/es-MX/);

    await page.goto('/');
    await settle(page);
    await expect(dialog(page)).toBeHidden();
});

test('dismissing it sticks, so a stray Escape is not a life sentence', async ({
    page,
}) => {
    await page.goto('/');
    await settle(page);
    await expect(dialog(page)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();

    // Declining stores no language, so only the separate "we asked" marker can keep
    // this from reappearing on every future visit.
    await page.reload();
    await settle(page);
    await expect(dialog(page)).toBeHidden();
});

test('a URL that names a language is itself an answer', async ({ page }) => {
    // Every other e2e spec navigates to /en-US..., so this is also what keeps the
    // prompt from appearing in all of them.
    await page.goto('/en-US/');
    await settle(page);
    await expect(dialog(page)).toBeHidden();
});

test('a bad link gets a 404, not a language modal', async ({ page }) => {
    await page.goto('/nosuchroute');
    await settle(page);
    await expect(dialog(page)).toBeHidden();
});

test('the language chooser opens exactly one dialog', async ({ page }) => {
    // The landing page used to mount its own chooser alongside the footer's, both
    // claiming id "locale" — so the URL param matched both and stacked two modals,
    // where dismissing the top one restored focus to the wrong opener.
    await page.goto('/en-US/?dialog=locale');
    await settle(page);
    await expect(dialog(page)).toHaveCount(1);

    // And by the button that opens it, which is the path a reader actually takes.
    await page.goto('/en-US/');
    await settle(page);
    // Its accessible name is the tooltip, not the visible label, so match the text.
    await page
        .locator('button.locale-picker')
        .filter({ hasText: 'other languages' })
        .click();
    await expect(dialog(page)).toHaveCount(1);
});
