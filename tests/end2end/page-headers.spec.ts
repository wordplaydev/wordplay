import { expect, test } from '@playwright/test';
import goHome from '../helpers/goHome';

/**
 * Every link in the site nav reaches a page whose heading says the same word.
 *
 * One test walking all eight, not eight tests: each of these was its own page
 * fixture and its own `goHome` navigation — eight full app loads, ~14s on CI —
 * for eight assertions about the same nav bar. Coming back through history is a
 * client-side route change, so the app boots once.
 *
 * (There was also a commented-out `learn link works` here, kept because it once
 * failed on Mobile Safari in CI. 'Learn' is in the list below and has been all
 * along, so the comment was describing a test that already existed. Mobile Safari
 * is not a configured project either — see playwright.config.ts.)
 */
const NavLinks = [
    'Projects',
    'Galleries',
    'Learn',
    'Guide',
    'About',
    'Login',
    'Rights',
    'Donate',
];

test('every nav link loads a page with the matching heading', async ({
    page,
}) => {
    await goHome(page);
    for (const link of NavLinks) {
        await page.getByText(link).nth(0).click();
        await expect(
            page.getByRole('heading', { name: link }),
            `the ${link} link should reach a page headed ${link}`,
        ).toBeVisible({ timeout: 10000 });
        await page.goBack();
        // Back is a history pop in a SPA, so wait for the nav to be usable
        // again rather than for a load event that never fires.
        await expect(page.getByText(NavLinks[0]).nth(0)).toBeVisible();
    }
});
