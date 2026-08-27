import { expect, type Page, test } from '@playwright/test';

// A phone, where the responsive arrangement shows one tile at a time and the tile
// toggles become a tab bar above the project row instead of collapsing into the
// footer's shared overflow popup.
test.use({ viewport: { width: 412, height: 839 } });

/** In a one-tile arrangement the tiles that aren't showing are squeezed to nothing
 *  rather than unmounted, so they stay technically visible to Playwright and "which
 *  tile am I looking at" is a question about size. */
async function widthOf(page: Page, id: string) {
    const box = await page.getByTestId(`tile-${id}`).boundingBox();
    return box?.width ?? 0;
}

async function expectShowing(page: Page, id: string) {
    await expect
        .poll(() => widthOf(page, id), {
            message: `${id} should fill the canvas`,
        })
        .toBeGreaterThan(300);
}

async function expectNotShowing(page: Page, id: string) {
    await expect
        .poll(() => widthOf(page, id), {
            message: `${id} should be squeezed out`,
        })
        .toBeLessThan(10);
}

test('switching tiles on a phone takes one tap', async ({ page }) => {
    await page.goto('/en-US/projects');

    await page.getByTestId('addproject').click();
    await page.waitForURL(/\/project\/.+/);

    // The tabs are their own row, not behind the footer's hamburger.
    await expect(
        page.locator('[data-uiid="projectControls"] .tile-row'),
    ).toBeVisible();

    await expectShowing(page, 'source0');

    // One tap switches. This click also proves the row didn't overflow into the
    // popup: a toggle tucked in there isn't visible to click.
    await page.getByTestId('docs-toggle').click();
    await expectShowing(page, 'docs');
    await expectNotShowing(page, 'source0');

    // Tapping the tile you're already on keeps it, rather than collapsing it and
    // promoting whatever was showing before.
    await page.getByTestId('docs-toggle').click();
    await expectShowing(page, 'docs');
    await expectNotShowing(page, 'source0');

    // And back again, in one tap.
    await page.getByTestId('output-toggle').click();
    await expectShowing(page, 'output');
    await expectNotShowing(page, 'docs');

    // The toggles render in exactly one place; Playwright's strict mode would have
    // failed the clicks above if they didn't, and this pins add-source too.
    await expect(page.locator('[data-uiid="addSource"]')).toHaveCount(1);
});
