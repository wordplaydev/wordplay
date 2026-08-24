import { expect, test } from '@playwright/test';

/**
 * "Test it" on a guide example (#1044).
 *
 * The example opens as an editable copy in a new window, kept on the device
 * and left out of the project list. The parts worth testing end to end are the
 * ones that cross a boundary: the new window is a separate document that can
 * only find the project through IndexedDB, and the guide has to still be there
 * when the reader comes back.
 */
test('a guide example opens as a scratch project without disturbing the guide', async ({
    context,
    page,
}) => {
    test.setTimeout(90000);

    await page.goto('/en-US/guide?concept=Phrase');
    const tinker = page
        .locator('button')
        .filter({ hasText: 'Test it' })
        .first();
    await expect(tinker).toBeVisible({ timeout: 30000 });

    const guideURL = page.url();
    const [opened] = await Promise.all([
        context.waitForEvent('page'),
        tinker.click(),
    ]);
    await opened.waitForLoadState('domcontentloaded');

    // The reader's place in the guide is untouched: the example opens beside
    // it, not on top of it.
    expect(page.url()).toBe(guideURL);

    await expect(opened).toHaveURL(/\/project\/scratch-/);
    // Editable, not the read-only view an example gets in the guide.
    await expect(
        opened.locator('[data-testid="editor"]:not(.readonly)').first(),
    ).toBeVisible({ timeout: 30000 });

    // And a way back that says where it goes, in case the guide window has
    // since been closed.
    await expect(
        opened.getByRole('link', { name: /back to Phrase/i }),
    ).toHaveCount(1);

    // The note tells you to remix it, so the control to do that is right there
    // — everywhere else the remix button appears only on a project you can't
    // edit, which a scratch project isn't.
    await expect(
        opened.getByRole('button', { name: /make your own copy/i }),
    ).toHaveCount(1);

    // Pressing it again lands in the same project rather than making another.
    const [again] = await Promise.all([
        context.waitForEvent('page'),
        tinker.click(),
    ]);
    await again.waitForLoadState('domcontentloaded');
    expect(new URL(again.url()).pathname).toBe(new URL(opened.url()).pathname);

    // It stays out of the project list: this is somewhere to tinker, not work
    // the creator has to tidy up.
    const projects = await context.newPage();
    await projects.goto('/en-US/projects');
    await expect(projects.getByTestId('project-search')).toBeVisible({
        timeout: 30000,
    });
    await projects.waitForTimeout(2000);
    await expect(projects.locator('a[href*="scratch-"]')).toHaveCount(0);
});
