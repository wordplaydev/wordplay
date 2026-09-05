import { expect, test, type Page } from '@playwright/test';
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
 * The galleries page's search results, which the route scan above can't reach:
 * they replace the tab bar only once a term is typed (#299), and they are a
 * different shape from what that scan sees — headed result groups mixing
 * gallery cards with project previews and their match excerpts.
 */
for (const scheme of ['light', 'dark'] as const) {
    test.describe(`gallery search results (${scheme})`, () => {
        test.use({ colorScheme: scheme });

        test('has no WCAG 2.2 AA violations', async ({ page }) => {
            await page.goto('/en-US/galleries');
            const search = page.locator('#gallery-search');
            await expect(search).toBeVisible({ timeout: 15000 });
            // A term that hits a built-in example, so a project preview with a
            // match excerpt is on screen and not just the empty-results notice.
            await search.fill('basketball');
            await expect(
                page.getByRole('heading', { name: /example projects/i }),
            ).toBeVisible({ timeout: 30000 });
            await expectNoAxeViolations(page);
        });
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

/**
 * The join flow's later steps, which the route scan above can't reach: `/join`
 * renders only the first of four, and each of the rest is a surface of its own
 * (#628). The country picker is 250 options long, the birthday is three fields
 * whose *order* comes from the reader's locale, and the credentials step
 * changes shape depending on which way to sign in was chosen.
 *
 * Each step is scanned exactly once. The two credential forms are different
 * markup and only one is ever on screen, so the second test walks the same
 * steps without re-scanning them — scanning immediately before clicking a
 * button left it perpetually "not stable" for Playwright, and scanning the same
 * three steps twice bought nothing anyway.
 */
for (const scheme of ['light', 'dark'] as const) {
    test.describe(`join flow (${scheme})`, () => {
        test.use({ colorScheme: scheme });

        /** Walk to the choice step. `US` keeps the age of consent at 13, and the
         *  birthday is an adult's, so both ways of signing in are offered. */
        async function reachChoice(page: Page) {
            await page.goto('/en-US/join');
            await expect(page.locator('#region-field')).toBeVisible({
                timeout: 15000,
            });
            await page.selectOption('#region-field', 'US');
            await page.getByTestId('join-next').click();
            await expect(page.locator('#birth-year-field')).toBeVisible();
            await page.locator('#birth-year-field').fill('1990');
            await page.selectOption('#birth-month-field', '1');
            await page.locator('#birth-day-field').fill('1');
            await page.getByTestId('join-next').click();
            // Move the pointer off the button that is about to appear. The
            // choice step puts "use a password" almost exactly where the
            // previous step's "next" was, so the mouse lands on it mid-render
            // and Button's hover transform keeps it from ever settling.
            await page.mouse.move(0, 0);
            await expect(page.getByTestId('join-use-password')).toBeVisible();
        }

        test('the steps and the email form have no WCAG 2.2 AA violations', async ({
            page,
        }) => {
            await page.goto('/en-US/join');
            await expect(page.locator('#region-field')).toBeVisible({
                timeout: 15000,
            });
            await expectNoAxeViolations(page);
            await page.selectOption('#region-field', 'US');
            await page.getByTestId('join-next').click();

            await expect(page.locator('#birth-year-field')).toBeVisible();
            await expectNoAxeViolations(page);
            await page.locator('#birth-year-field').fill('1990');
            await page.selectOption('#birth-month-field', '1');
            await page.locator('#birth-day-field').fill('1');
            await page.getByTestId('join-next').click();

            await expect(page.getByTestId('join-use-email')).toBeVisible();
            await expectNoAxeViolations(page);
            await page.getByTestId('join-use-email').click();
            await expect(page.locator('#join-email-field')).toBeVisible();
            await expectNoAxeViolations(page);
        });

        test('the password form has no WCAG 2.2 AA violations', async ({
            page,
        }) => {
            await reachChoice(page);
            await page.getByTestId('join-use-password').click();
            await expect(page.locator('#password-field')).toBeVisible();
            await expectNoAxeViolations(page);
        });
    });
}
