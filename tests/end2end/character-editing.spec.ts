import { expect, test } from '@playwright/test';
import { createTestCharacter } from '../helpers/createCharacter';
import { drawTriangle } from '../helpers/drawCharacterPath';
import { loginNewContext } from '../helpers/loginNewContext';

/**
 * Editing a character path's points and curves — what axe's static scan can't
 * see. The point handles exist so a path can be refined after it's drawn, and
 * they have to work with the keyboard alone: they live inside a
 * role="application" canvas, where a swallowed Tab would be a WCAG 2.1.2
 * keyboard trap.
 */

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

/**
 * Undo has to undo exactly one edit. It recorded the state *before* each change
 * and then pointed at it, which was right only for the callers that mutated the
 * shapes in place first — so drawing with the keyboard, deleting, pasting and
 * fitting all jumped two steps back, and the newest state could never be reached
 * again. The pointer path went through a different call and hid it.
 */
test('undo steps back exactly one keyboard-drawn pixel', async ({
    browser,
}) => {
    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        await createTestCharacter(page);
        await page.getByRole('radio', { name: 'pixel', exact: true }).click();
        await page.locator('.canvas').focus();

        const pixels = page.locator('.canvas svg rect');
        for (let drawn = 0; drawn < 3; drawn++) {
            await page.keyboard.press(' ');
            await page.keyboard.press('ArrowRight');
        }
        await expect.poll(() => pixels.count()).toBe(3);

        await page.keyboard.press('Control+z');
        await expect.poll(() => pixels.count()).toBe(2);

        // And the state the undo left is still reachable, rather than replaced
        // by a second copy of an older one.
        await page.keyboard.press('Control+Shift+z');
        await expect.poll(() => pixels.count()).toBe(3);
    } finally {
        await context.close();
    }
});

/**
 * Flipping mirrored each shape about its own center, which is a no-op for a
 * rectangle — so the button silently did nothing to one — and it never recorded
 * the change, so nothing it did could be undone.
 */
test('flipping moves a rectangle, and the flip can be undone', async ({
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

        // A path beside the rectangle gives the selection a box wider than the
        // rectangle itself, which is what a flip mirrors about.
        await page
            .getByRole('radio', { name: 'rectangle', exact: true })
            .click();
        await page.locator('.canvas').focus();
        for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown'])
            await page.keyboard.press(key);
        await page.keyboard.press(' ');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press(' ');

        await page.keyboard.press('Control+a');
        const rect = page.locator('.canvas svg rect').first();
        const before = await rect.getAttribute('x');

        await page.getByRole('button', { name: /flip.*horizontal/i }).click();
        await expect.poll(() => rect.getAttribute('x')).not.toBe(before);

        await page.keyboard.press('Control+z');
        await expect.poll(() => rect.getAttribute('x')).toBe(before);
    } finally {
        await context.close();
    }
});
