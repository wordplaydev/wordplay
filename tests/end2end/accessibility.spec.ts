import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolationsInBothSchemes } from '../helpers/checkAccessibility';

/**
 * The axe gate for public pages: every route below must be free of
 * axe-detectable WCAG 2.2 Level AA violations in BOTH color schemes.
 *
 * Each surface is navigated ONCE and scanned twice, via
 * `expectNoAxeViolationsInBothSchemes`. The app follows the device scheme, so
 * flipping `prefers-color-scheme` re-resolves every `light-dark()` token without
 * a reload — and the reload was the whole cost, since navigation and hydration
 * are 3-4s before a single rule is checked. See that helper for the measurement.
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
    // A public gallery's how-to space, which a signed-out visitor can open
    // (#1351) and which no scan reached until #1354 — an infinite pan canvas of
    // virtualized tiles, and none of it had ever had an axe pass. Signed out is
    // also the state with no social pane, so this covers the canvas and its
    // tiles without the affordances only a member gets.
    '/gallery/seed-public-gallery-00/howto',
    // The release notes, which had never been scanned. Its content is markup
    // rendered from a fetched bundle rather than the locale tree — emoji
    // markers, section labels, and web links — so it is a different shape from
    // every other static page here.
    '/updates',
];

/**
 * Routes whose content arrives after hydration, and the selector that says it
 * has. Without this the shared heading marker is satisfied by the page header
 * and axe scans a page with none of its content on it — a pass that means
 * nothing. Only routes that fetch their own content need an entry.
 */
const ContentMarkers: Record<string, string> = {
    // The updates page fetches static/updates.json rather than importing it,
    // so its section headings are the first sign the releases have rendered.
    '/updates': 'h3',
};

test.describe('public pages', () => {
    for (const route of PUBLIC_ROUTES) {
        test(`${route} has no WCAG 2.2 AA violations`, async ({ page }) => {
            await page.goto(`/en-US${route}`);
            // Hydration marker: every page renders a heading once the
            // client has taken over (and Title's $effect has run).
            await expect(page.getByRole('heading').first()).toBeVisible({
                timeout: 15000,
            });
            const marker = ContentMarkers[route];
            if (marker !== undefined)
                await expect(page.locator(marker).first()).toBeVisible({
                    timeout: 15000,
                });
            await expectNoAxeViolationsInBothSchemes(page);
        });
    }
});

/**
 * The galleries page's search results, which the route scan above can't reach:
 * they replace the tab bar only once a term is typed (#299), and they are a
 * different shape from what that scan sees — headed result groups mixing
 * gallery cards with project previews and their match excerpts.
 */
test.describe('gallery search results', () => {
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
        await expectNoAxeViolationsInBothSchemes(page);
    });
});

/**
 * The landing page's carousel, which the route scan above can't reach: it
 * doesn't exist until a visitor presses for it, because loading it downloads
 * the language runtime. Its tab list, its read-only code, and the running
 * output are all new surfaces, so they get the same gate in both schemes.
 */
test.describe('landing carousel', () => {
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
        await expectNoAxeViolationsInBothSchemes(page);

        // And again on an example the viewer has switched to, since each
        // renders different output and different code.
        await page.getByRole('tab').nth(6).click();
        await expect(page.getByRole('tab').nth(6)).toHaveAttribute(
            'aria-selected',
            'true',
        );
        await expectNoAxeViolationsInBothSchemes(page);
    });
});

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
test.describe('join flow', () => {
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
        await expectNoAxeViolationsInBothSchemes(page);
        await page.selectOption('#region-field', 'US');
        await page.getByTestId('join-next').click();

        await expect(page.locator('#birth-year-field')).toBeVisible();
        await expectNoAxeViolationsInBothSchemes(page);
        await page.locator('#birth-year-field').fill('1990');
        await page.selectOption('#birth-month-field', '1');
        await page.locator('#birth-day-field').fill('1');
        await page.getByTestId('join-next').click();

        await expect(page.getByTestId('join-use-email')).toBeVisible();
        await expectNoAxeViolationsInBothSchemes(page);
        await page.getByTestId('join-use-email').click();
        await expect(page.locator('#join-email-field')).toBeVisible();
        await expectNoAxeViolationsInBothSchemes(page);
    });

    test('the password form has no WCAG 2.2 AA violations', async ({
        page,
    }) => {
        await reachChoice(page);
        await page.getByTestId('join-use-password').click();
        await expect(page.locator('#password-field')).toBeVisible();
        await expectNoAxeViolationsInBothSchemes(page);
    });
});
