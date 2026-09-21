import type { Page } from '@playwright/test';

/**
 * Wait for webfonts, so a box measured now is the box that will be painted.
 *
 * A spec that measures geometry the instant an element becomes visible is
 * racing the font load: a late swap reflows the text and moves the very edges
 * being compared. `emoji-range.spec.ts` was doing this by hand; anything that
 * asserts on `getBoundingClientRect` should do it too, and on WebKit — where
 * the nightly runs two to three times slower — the gap is wide enough to lose.
 */
export async function fontsReady(page: Page) {
    await page.evaluate(() => document.fonts.ready);
}

/**
 * A bounding box that has stopped moving, for a drag or click computed from
 * absolute coordinates.
 *
 * `boundingBox()` answers wherever the element is at that instant, and a
 * pointer sequence issued from it lands somewhere else entirely if the layout
 * settles in between — which is how a drag across a canvas stored no shape.
 * Playwright's own actionability check covers this for `click()`, but not for
 * `page.mouse` coordinates, so anything computing its own points needs it.
 */
export async function stableBox(
    locator: import('@playwright/test').Locator,
    tries = 20,
) {
    let last: Awaited<ReturnType<typeof locator.boundingBox>> = null;
    for (let attempt = 0; attempt < tries; attempt++) {
        const box = await locator.boundingBox();
        if (
            box !== null &&
            last !== null &&
            box.x === last.x &&
            box.y === last.y &&
            box.width === last.width &&
            box.height === last.height
        )
            return box;
        last = box;
        await locator.page().waitForTimeout(100);
    }
    if (last === null)
        throw new Error('the element never reported a bounding box');
    return last;
}
