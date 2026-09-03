import { expect, test, type Page } from '@playwright/test';

/**
 * Two things about the landing page's scrolling, which have twice been wrong in
 * ways nothing caught.
 *
 * The page carries its route links twice — as the big links in the content, and
 * as the footer's tabs, which arrive as the big ones leave — and the handover is
 * the only thing keeping those destinations reachable, so at no scroll position
 * may both be gone. The steps below ask the page what is actually *painted* at
 * each link's position rather than whether it is laid out, since `toBeVisible()`
 * knows nothing about a link covered by something else.
 *
 * And nothing on this page is pinned. A stage pinned to the top of a short
 * landscape screen left only a quarter of the window to scroll the rest of the
 * page through, so the last test holds the stage to scrolling like everything
 * else at exactly that size.
 */

/** A route the footer carries, standing in for the tab row's arrival. */
const Route = '/projects';

/** Enough steps to land inside the ~500px window the gap used to occupy. */
const Steps = 24;

type Handover = { content: boolean; tab: boolean };

async function readHandover(page: Page): Promise<Handover> {
    return page.evaluate((route) => {
        // Any one of the big links being painted is enough: they are one block
        // that arrives and leaves together, and at the top of the page the
        // lower rows are simply still below the fold.
        const content = [...document.querySelectorAll('.links a')].some(
            (link) => {
                const box = link.getBoundingClientRect();
                // Sampled down the link rather than at its middle alone: a row
                // half out from under the hero is still readable, and counts.
                return [0.25, 0.5, 0.75].some((at) => {
                    const painted = document.elementFromPoint(
                        box.left + box.width / 2,
                        box.top + box.height * at,
                    );
                    return painted !== null && link.contains(painted);
                });
            },
        );
        return {
            content,
            tab: document.querySelector(`footer a[href$="${route}"]`) !== null,
        };
    }, Route);
}

async function scrollTo(page: Page, top: number) {
    await page.evaluate((y) => {
        const main = document.querySelector('main');
        if (main !== null) main.scrollTop = y;
    }, top);
    // The observer's callback lands a frame or two after the scroll it answers.
    await page.waitForTimeout(150);
}

/** Steps the scroller down through the handover and back up, failing at the
 *  first position where neither set of links can be seen. */
async function expectReachableThroughout(page: Page) {
    // Far enough to carry the links out of the scroller entirely, which is
    // where the tabs are unambiguously the only thing left. Measured from the
    // top, so this reads the same whatever the caller left the scroller at.
    const extent = await page.evaluate(() => {
        const main = document.querySelector('main');
        const links = document.querySelector('.links');
        if (main === null || links === null) return null;
        main.scrollTop = 0;
        return Math.min(
            links.getBoundingClientRect().bottom -
                main.getBoundingClientRect().top +
                100,
            main.scrollHeight - main.clientHeight,
        );
    });
    if (extent === null) throw new Error('The landing page has no scroller.');
    expect(extent).toBeGreaterThan(0);

    const down = Array.from({ length: Steps + 1 }, (_, step) =>
        Math.round((extent * step) / Steps),
    );
    const seen = { content: 0, tab: 0 };
    // Down and back up: the gap ran in both directions.
    for (const y of [...down, ...down.slice(0, -1).reverse()]) {
        await scrollTo(page, y);
        const state = await readHandover(page);
        expect(
            state.content || state.tab,
            `neither the links nor the tabs were visible at scrollTop ${y}`,
        ).toBe(true);
        if (state.content) seen.content += 1;
        if (state.tab) seen.tab += 1;
    }

    // Both halves were actually exercised, so a page that never scrolled — or
    // one whose tabs simply never left — can't pass by standing still.
    expect(seen.content).toBeGreaterThan(0);
    expect(seen.tab).toBeGreaterThan(0);
}

test('one of the two sets of route links is visible at every scroll position', async ({
    page,
}) => {
    // Locale-prefixed, so the first-run language prompt doesn't open over the
    // page and eat the scrolling.
    await page.goto('/en-US');
    await expect(page.getByRole('heading').first()).toBeVisible({
        timeout: 15000,
    });

    await expectReachableThroughout(page);
});

/**
 * The same invariant at a phone's width, where the links reflow to fewer
 * columns — which is what the margins above are measured against.
 */
test.describe('narrow', () => {
    test.use({ viewport: { width: 600, height: 800 } });

    test('holds where the links wrap to fewer columns', async ({ page }) => {
        await page.goto('/en-US');
        await expect(page.getByRole('heading').first()).toBeVisible({
            timeout: 15000,
        });
        await expectReachableThroughout(page);
    });
});

/**
 * A landscape tablet: wide enough to miss every width breakpoint, short enough
 * that anything pinned to the top eats the page. Both properties matter, so
 * this covers the handover here too.
 */
test.describe('landscape tablet', () => {
    test.use({ viewport: { width: 1024, height: 768 } });

    test('scrolls the stage away rather than pinning it', async ({ page }) => {
        await page.goto('/en-US');
        await expect(page.getByRole('heading').first()).toBeVisible({
            timeout: 15000,
        });

        // A pinned stage answers a scroll by staying put, so ask how far it
        // moved rather than reading its CSS: the point is what the reader gets.
        const travel = await page.evaluate(async () => {
            const main = document.querySelector('main');
            const hero = document.querySelector('.hero');
            if (main === null || hero === null) return null;
            main.scrollTop = 0;
            await new Promise((go) => requestAnimationFrame(go));
            const before = hero.getBoundingClientRect().top;
            main.scrollTop = 400;
            await new Promise((go) => requestAnimationFrame(go));
            return before - hero.getBoundingClientRect().top;
        });
        expect(travel).toBe(400);

        await expectReachableThroughout(page);
    });
});

/**
 * Login is one of the route links, so it lines up with them. It sat at the page
 * edge instead, a good 140px outside the grid below it, because the grid is
 * capped at the measure and centered while its sibling was left to stretch —
 * which reads as a mistake next to an otherwise centered page.
 */
test('the login link starts where the route grid starts', async ({ page }) => {
    await page.goto('/en-US');
    const login = page.locator('.links > .biglink').first();
    // Signed out, which is when the link exists at all.
    await login.waitFor({ timeout: 15000 });
    const edges = await page.evaluate(() => {
        const start = (selector: string) => {
            const found = document.querySelector(selector);
            if (found === null) return null;
            const box = found.getBoundingClientRect();
            return { x: Math.round(box.x), width: Math.round(box.width) };
        };
        return {
            login: start('.links > .biglink'),
            grid: start('.links .actions'),
        };
    });
    expect(edges.login).toEqual(edges.grid);
});
