import type { Page } from '@playwright/test';

/**
 * Draw a closed triangle in the character editor with the keyboard alone, and
 * leave it selected. Shared so the axe gate can reach the point-editing state —
 * a freshly created character has no path, and point editing needs one.
 */
export async function drawTriangle(page: Page) {
    await page.getByRole('radio', { name: 'path', exact: true }).click();
    await page.locator('.canvas').focus();
    for (const step of [
        [],
        ['ArrowRight', 'ArrowRight', 'ArrowRight'],
        ['ArrowDown', 'ArrowDown', 'ArrowDown'],
    ]) {
        for (const key of step) await page.keyboard.press(key);
        await page.keyboard.press(' ');
    }
    // Escape finishes the path, which leaves it selected.
    await page.keyboard.press('Escape');
}

/** Draw a path and open its points, so the handles and their toolbar are showing. */
export async function editTrianglePoints(page: Page) {
    await drawTriangle(page);
    await page.keyboard.press('Enter');
    await page.locator('[data-handle="point-0"]').waitFor();
}
