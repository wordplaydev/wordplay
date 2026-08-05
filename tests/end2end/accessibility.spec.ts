import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from '../helpers/checkAccessibility';

/**
 * The axe gate for public pages: every route below must be free of
 * axe-detectable WCAG 2.2 Level AA violations in BOTH color schemes.
 *
 * Policy for rendered Wordplay output (the stage): it is IN scope. All
 * content these tests scan is Wordplay-authored (seeds, guide examples,
 * tutorial), so violations there are ours to fix. Excluding a region is
 * reserved for genuinely creator-authored content and requires an inline
 * comment at the call site (see expectNoAxeViolations).
 */

const PUBLIC_ROUTES = [
    '/',
    '/learn',
    '/guide',
    '/login',
    '/rights',
    '/donate',
    '/about',
    '/join',
    '/galleries',
    '/characters',
];

for (const scheme of ['light', 'dark'] as const) {
    test.describe(`public pages (${scheme})`, () => {
        // The app follows the device scheme (color-scheme: light dark), so
        // emulating the scheme flips every light-dark() color.
        test.use({ colorScheme: scheme });

        for (const route of PUBLIC_ROUTES) {
            test(`${route} has no WCAG 2.2 AA violations`, async ({ page }) => {
                await page.goto(`/en-US${route}`);
                // Hydration marker: every page renders a heading once the
                // client has taken over (and Title's $effect has run).
                await expect(page.getByRole('heading').first()).toBeVisible({
                    timeout: 15000,
                });
                await expectNoAxeViolations(page);
            });
        }
    });
}
