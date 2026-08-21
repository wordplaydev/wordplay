import { test as anyone, expect } from '@playwright/test';
import { test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * The languages dialog's two front-door behaviors (#1276).
 *
 * A project with one language gains nothing from being told it has one, so the
 * button asks a question instead — and once it has more, the count is the useful
 * thing. And translating is only offered to a signed-in creator, because the
 * daily budget that keeps translation from being a Denial-of-Wallet target
 * (#1073) is per creator and can't be enforced against anyone else.
 */

// The Dialog renders its trigger and its (always-present) dialog inside the
// same wrapper, so the trigger is the first button in it.
const LanguagesButton = '[data-uiid="languagesButton"] button';

test('the languages button prompts to translate until there are languages to count', async ({
    page,
}) => {
    await createTestProject(page);

    const trigger = page.locator(LanguagesButton).first();

    // One language: a prompt, not a count.
    await expect(trigger).toContainText('translate');

    // Add a second, and the count becomes worth showing.
    await trigger.click();
    await page
        .locator('#languages-tabs-panel button')
        .filter({ hasText: 'español' })
        .first()
        .click();

    await expect(trigger).toContainText('2');
});

// The shared fixture signs in, so the signed-out case needs the bare test with
// no stored credentials.
anyone.use({ storageState: { cookies: [], origins: [] } });

anyone(
    'a signed-out creator is told translating needs an account',
    async ({ page }) => {
        await createTestProject(page);

        await page.locator(LanguagesButton).first().click();
        // The second tab is the translation one.
        await page.getByRole('tab').nth(1).click();

        // An explanation, not a dead button.
        await expect(page.getByText(/needs an account/i)).toBeVisible();
        await expect(
            page.getByRole('button', {
                name: /translate this project into a new language/i,
            }),
        ).toHaveCount(0);
    },
);
