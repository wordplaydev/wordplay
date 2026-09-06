import { expect, test } from '@playwright/test';

/**
 * The projects page's search field. One navigation, since both claims are about
 * the same page in the same state.
 *
 * This file used to carry nine more tests inside a block comment — filtering,
 * clearing, no-results — commented out rather than deleted, along with nine
 * `waitForTimeout(500)`s. They were not covering anything while commented, and
 * they made the file look like it cost more than it did. If that filtering
 * behavior is worth covering, it is worth covering here as real tests.
 */
test.describe('project search', () => {
    test('shows a search field, and survives special characters', async ({
        page,
    }) => {
        await page.goto('/en-US/projects');
        const search = page.getByTestId('project-search');
        await expect(search).toBeVisible();

        // Characters that could reach a regex, a URL, or a selector. The claim
        // is that the field takes them and the page stays put — asserted on the
        // field's own value rather than by sleeping, which is what the previous
        // version did five times over for an assertion that could never fail.
        for (const term of ['test@', 'test#', 'test$', 'test%', 'test&']) {
            await search.fill(term);
            await expect(search).toHaveValue(term);
            await expect(page).toHaveURL(/\/projects$/);
        }
    });
});
