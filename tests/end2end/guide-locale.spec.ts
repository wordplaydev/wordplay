import { expect, test, type Page } from '@playwright/test';

/**
 * The guide's navigation history holds the concept you are reading as an
 * *object*, and changing locale rebuilds the concept index with entirely fresh
 * ones. Nothing remapped them, so the concept went on rendering — it carries its
 * own documentation — while everything the new index was asked about it came
 * back empty, and the how-to links beside it vanished until the page was
 * refreshed.
 *
 * Asserted through the interface rather than against the index, because the
 * fix's first attempt passed every unit test: it computed the remap and then
 * discarded it, having compared the result with the same `isEqualTo` that calls
 * a stale concept and its replacement identical.
 */

/** The state of a concept view: what it says, and what it links to. */
async function conceptView(page: Page) {
    return page
        .locator('.concept')
        .first()
        .evaluate((el) => ({
            howTos: el.querySelectorAll('.links .howtos li').length,
            documentation: (
                el.querySelector('.bubble')?.textContent ?? ''
            ).slice(0, 40),
        }));
}

test('a concept keeps its links when the reader changes locale', async ({
    page,
}) => {
    // Phrase is referenced by many how-tos, so it has links to lose.
    await page.goto('/en-US/guide?concept=Phrase');
    const links = page.locator('.concept .links .howtos li');
    await links.first().waitFor({ timeout: 20000 });
    const before = await conceptView(page);
    expect(before.howTos).toBeGreaterThan(0);

    // Change locale the way a reader does, through the footer's chooser.
    // By test id, not by label: the chooser's accessible name is its tooltip,
    // which is itself translated, and its visible label ("English") also appears
    // inside the dialog it opens.
    await page.getByTestId('locale-chooser').first().click();
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    await dialog.locator('button:has-text("日本語")').first().click();

    // Confirm the switch itself before asking anything about the concept, so a
    // chooser that failed to take reports that rather than blaming the view.
    // The guide stays mounted across this — SvelteKit reuses the component for
    // the same route — which is precisely why the stale concepts survive it.
    await expect
        .poll(async () => page.evaluate(() => document.documentElement.lang), {
            message: 'the locale never changed',
            timeout: 20000,
        })
        .toBe('ja');

    // The concept re-rendered in the new locale rather than keeping the prose
    // its stale, previous-locale self was still carrying.
    await expect
        .poll(async () => (await conceptView(page)).documentation, {
            message: 'the concept never re-rendered in the new locale',
            timeout: 20000,
        })
        .not.toBe(before.documentation);

    // ...and the links survived it.
    const after = await conceptView(page);
    expect(after.howTos).toBeGreaterThan(0);
});
