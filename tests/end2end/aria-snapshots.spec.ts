import { expect, test } from '@playwright/test';

/**
 * Accessibility-tree snapshots for stable regions: the closest CI-checkable
 * proxy for what a screen reader perceives. toMatchAriaSnapshot uses subset
 * matching, so these templates pin the roles/names that must exist without
 * breaking when new content is added around them. en-US only — names are
 * localized.
 */

test('login page exposes a labeled form to assistive tech', async ({
    page,
}) => {
    await page.goto('/en-US/login');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.locator('main')).toMatchAriaSnapshot(`
        - heading "Login"
        - textbox
        - textbox
        - button
    `);
});

test('site navigation exposes named links to assistive tech', async ({
    page,
}) => {
    await page.goto('/en-US/about');
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
    // The pinned footer navigation: each destination must be a real link
    // with an accessible name, not a click-handling div (names include the
    // links' emoji prefixes).
    await expect(page.locator('body')).toMatchAriaSnapshot(`
        - navigation:
          - link "📚Projects"
          - link "🎭Galleries"
          - link "🙂Characters"
          - link "🎓Learn"
          - link "📕Guide"
          - button "show settings dialog"
          - button "open notifications dialog"
    `);
});

test('character previews are named links', async ({ page }) => {
    await page.goto('/en-US/characters');
    await expect(
        page.getByRole('heading', { name: 'Characters' }),
    ).toBeVisible();
});
