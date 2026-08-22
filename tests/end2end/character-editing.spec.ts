import { expect, test, type Page } from '@playwright/test';
import { createTestCharacter } from '../helpers/createCharacter';
import { loginNewContext } from '../helpers/loginNewContext';

/**
 * Editing a character path's points and curves — what axe's static scan can't
 * see. The point handles exist so a path can be refined after it's drawn, and
 * they have to work with the keyboard alone: they live inside a
 * role="application" canvas, where a swallowed Tab would be a WCAG 2.1.2
 * keyboard trap.
 */

/** Draw a triangle with the keyboard alone, which is the case these tests cover. */
async function drawTriangle(page: Page) {
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

test('path handles are reachable by Tab and are not a trap', async ({
    browser,
    browserName,
}) => {
    // WebKit visits form controls only by default, so a Tab walk between
    // buttons can't be measured there; Chromium covers the contract.
    test.skip(
        browserName === 'webkit',
        'WebKit omits buttons from the tab order by default',
    );

    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        await createTestCharacter(page);
        await drawTriangle(page);

        // Enter opens the selected path for point editing, as it does elsewhere
        // in this editor, and focus lands on the first handle.
        await page.keyboard.press('Enter');
        const handles = page.locator('[data-handle]');
        await expect(handles.first()).toBeFocused();
        expect(await handles.count()).toBe(3);

        // Tab moves between handles rather than being swallowed by the canvas.
        await page.keyboard.press('Tab');
        await expect(handles.nth(1)).toBeFocused();

        // And Tab keeps going, off the handles entirely.
        let escaped = false;
        for (let press = 0; press < 25 && !escaped; press++) {
            await page.keyboard.press('Tab');
            escaped = await page.evaluate(
                () => document.activeElement?.closest('[data-handle]') === null,
            );
        }
        expect(escaped, 'Tab never moved focus off the path handles').toBe(
            true,
        );
    } finally {
        await context.close();
    }
});

test('a path point moves with the arrow keys and the move can be undone', async ({
    browser,
}) => {
    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        await createTestCharacter(page);
        await drawTriangle(page);
        await page.keyboard.press('Enter');

        const first = page.locator('[data-handle="point-0"]');
        await expect(first).toBeFocused();
        const before = await first.getAttribute('aria-label');

        await page.keyboard.press('ArrowDown');
        await expect
            .poll(() => first.getAttribute('aria-label'))
            .not.toBe(before);

        // Point edits go through the same history as every other edit — and an
        // undo swaps in a fresh clone of the shapes, so the handles have to
        // re-anchor to it rather than keep drawing what was just discarded.
        await page.keyboard.press('Control+z');
        await expect.poll(() => first.getAttribute('aria-label')).toBe(before);
    } finally {
        await context.close();
    }
});

test('a segment can be curved and straightened again', async ({ browser }) => {
    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        await createTestCharacter(page);
        await drawTriangle(page);
        await page.keyboard.press('Enter');

        // Curving the segment arriving at the second point adds its handle and
        // turns that segment into a quadratic.
        await page.locator('[data-handle="point-1"]').focus();
        await page.getByRole('button', { name: /bend the segment/ }).click();
        const control = page.locator('[data-handle="curve-1"]');
        await expect(control).toBeVisible();
        const path = page.locator('.canvas svg path').first();
        await expect.poll(() => path.getAttribute('d')).toContain('Q');

        // Delete on a control handle straightens rather than removing a point.
        await control.focus();
        await page.keyboard.press('Delete');
        await expect(control).toHaveCount(0);
        await expect.poll(() => path.getAttribute('d')).not.toContain('Q');
        await expect(page.locator('[data-handle]')).toHaveCount(3);
    } finally {
        await context.close();
    }
});

test('the canvas description names the keys that edit points', async ({
    browser,
}) => {
    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        await createTestCharacter(page);
        await drawTriangle(page);
        await page.keyboard.press('Enter');

        // aria-describedby used to point at an id nothing rendered, so the
        // canvas — the editor's primary surface — had no description at all.
        const description = await page.evaluate(() => {
            const canvas = document.querySelector('[role="application"]');
            const id = canvas?.getAttribute('aria-describedby');
            return id
                ? (document.getElementById(id)?.textContent ?? null)
                : null;
        });
        expect(description).toContain('Tab');
        expect(description).toContain('arrow');
    } finally {
        await context.close();
    }
});
