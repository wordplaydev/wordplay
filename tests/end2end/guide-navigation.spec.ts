import { expect, test, type Page } from '@playwright/test';

/**
 * The guide navigates like a browser: every move is one history entry, Back and
 * Forward restore the location the URL names, and the section tabs and breadcrumb
 * say where that location is filed rather than how it was reached.
 *
 * Forward used to be dead: restoring a location also restored the search box, which
 * pushed a search onto the restored history and rewrote the URL as a *push*, taking
 * every Forward entry with it. Only a browser can show that, so this is an e2e test.
 */

/** The guide's half of the breadcrumb, crumb by crumb. */
async function crumbs(page: Page) {
    return page
        .locator('nav.breadcrumbs .crumb')
        .evaluateAll((els) => els.map((el) => el.textContent?.trim() ?? ''));
}

/** Records whether the documentation panel was ever on screen without a concept in
 *  it — the default landing showing before the concept a URL names. */
async function watchForLanding(page: Page) {
    await page.addInitScript(() => {
        const flags = { landing: false };
        Object.assign(window, { __guideFlash: flags });
        new MutationObserver(() => {
            if (
                document.querySelector('[data-testid="documentation"]') &&
                !document.querySelector('.concept')
            )
                flags.landing = true;
        }).observe(document, { childList: true, subtree: true });
    });
}

const sectionTab = (page: Page, name: RegExp) =>
    page.getByRole('tablist').first().getByRole('tab', { name });

test('Back and Forward move through the guide, and the tabs show where a concept lives', async ({
    page,
}) => {
    await page.goto('/en-US/guide/howto');
    const howto = sectionTab(page, /how/i);
    await expect(howto).toHaveAttribute('aria-selected', 'true');

    // Open a concept found by search, from a section it doesn't belong to.
    await page.locator('#concept-search').fill('Phrase');
    await expect(page).toHaveURL(/\/guide\/search\?query=Phrase$/);
    const length = await page.evaluate(() => history.length);
    const result = page
        .locator('a.conceptlink', { hasText: /^Phrase/ })
        .first();
    // A real link, so it can be opened in a new tab.
    await expect(result).toHaveAttribute(
        'href',
        /\/guide\/code\/outputs\/Phrase$/,
    );
    await result.click();
    await expect(page).toHaveURL(/\/guide\/code\/outputs\/Phrase$/);
    // One click, one entry.
    expect(await page.evaluate(() => history.length)).toBe(length + 1);

    // The tabs mark the section and subsection Phrase is filed under, without
    // selecting either.
    const code = sectionTab(page, /code/i);
    await expect(code).toHaveAttribute('aria-current', 'location');
    await expect(code).toHaveAttribute('aria-selected', 'false');
    await expect(howto).toHaveAttribute('aria-selected', 'false');
    const outputs = page.getByRole('tab', { name: /output$/i });
    await expect(outputs).toHaveAttribute('aria-current', 'location');
    await expect(outputs).toHaveAttribute('aria-selected', 'false');
    expect(await crumbs(page)).toEqual([
        expect.stringMatching(/Guide$/),
        expect.stringMatching(/code/i),
        expect.stringMatching(/output/i),
        expect.stringMatching(/^Phrase/),
    ]);

    // Back returns to the results, with the query in the box.
    await page.goBack();
    await expect(page).toHaveURL(/query=Phrase/);
    await expect(page.locator('#concept-search')).toHaveValue('Phrase');
    // And stays there: restoring the location must not write the old one back,
    // which made Back flicker between the two pages.
    await expect(code).toHaveCount(0);
    await expect(page).toHaveURL(/query=Phrase/);

    // Forward returns to the concept, rather than having been thrown away.
    await page.goForward();
    await expect(page).toHaveURL(/\/guide\/code\/outputs\/Phrase$/);
    await expect(code).toHaveAttribute('aria-current', 'location');

    // Choosing the subsection a concept is in goes to that subsection's page.
    await outputs.click();
    await expect(page).toHaveURL(/\/en-US\/guide$/);
    await expect(outputs).toHaveAttribute('aria-selected', 'true');
    await expect(code).toHaveAttribute('aria-selected', 'true');

    // The guide has no project, so it borrows no kits, and offers no tab for them.
    await expect(page.getByRole('tab', { name: /^\W*kit$/i })).toHaveCount(0);
});

test('a concept URL shows the concept from the first paint, never the default landing', async ({
    page,
}) => {
    await watchForLanding(page);
    await page.goto('/en-US/guide/code/decisions/Conditional');
    await expect(page.locator('.concept').first()).toBeVisible();
    expect(
        await page.evaluate(() =>
            'landing' in (window.__guideFlash ?? {})
                ? window.__guideFlash?.landing
                : undefined,
        ),
    ).toBe(false);

    // A link from before locations were paths still lands, and is tidied in place.
    await page.goto('/en-US/guide?concept=Conditional');
    await expect(page).toHaveURL(
        /\/en-US\/guide\/code\/decisions\/Conditional$/,
    );
    await expect(page.locator('.concept').first()).toBeVisible();
});

test('section landings are prerendered in every locale', async ({
    request,
}) => {
    const html = await (await request.get('/es-MX/guide/code/inputs')).text();
    expect(html).toContain('data-testid="documentation"');
    // A concept is not prerendered, so it gets the empty shell, not a landing.
    const concept = await (
        await request.get('/es-MX/guide/code/decisions/Conditional')
    ).text();
    expect(concept).not.toContain('data-testid="documentation"');
});

declare global {
    interface Window {
        __guideFlash?: { landing: boolean };
    }
}
