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
    // A concept whose example trips the photosensitivity gate, so the scan
    // covers the content-warning overlay's scroll region and its labeling.
    '/guide?concept=Sequence/shake',
    '/login',
    '/rights',
    '/donate',
    '/about',
    '/join',
    '/galleries',
    '/characters',
    '/design',
    // The settings dialog, which no route scan reaches: it opens from the URL.
    // Signed out is also the dimmed state of the cloud badge marking a synced
    // setting, so this covers that color in both schemes.
    '/?dialog=settings',
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

/**
 * The landing page's carousel, which the route scan above can't reach: it
 * doesn't exist until a visitor presses for it, because loading it downloads
 * the language runtime. Its tab list, its read-only code, and the running
 * output are all new surfaces, so they get the same gate in both schemes.
 */
for (const scheme of ['light', 'dark'] as const) {
    test.describe(`landing carousel (${scheme})`, () => {
        test.use({ colorScheme: scheme });

        test('has no WCAG 2.2 AA violations', async ({ page }) => {
            await page.goto('/en-US');
            const show = page.getByRole('button', {
                name: /show me/i,
            });
            await expect(show).toBeVisible({ timeout: 15000 });
            await show.click();
            // The tab list only exists once the runtime chunk has arrived.
            await expect(page.getByRole('tab').first()).toBeVisible({
                timeout: 30000,
            });
            await expectNoAxeViolations(page);

            // And again on an example the viewer has switched to, since each
            // renders different output and different code.
            await page.getByRole('tab').nth(6).click();
            await expect(page.getByRole('tab').nth(6)).toHaveAttribute(
                'aria-selected',
                'true',
            );
            await expectNoAxeViolations(page);
        });
    });
}
