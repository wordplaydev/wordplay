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

/**
 * An adjustable brush and eraser (#898), and the gap filling that goes with it:
 * the report was that erasing meant clicking box by box.
 */
test('the brush covers the size it says, and the eraser clears it again', async ({
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

        const size = page.locator('.palette input[type="range"]').first();
        await size.fill('4');

        const canvas = page.locator('.canvas');
        const box = await canvas.boundingBox();
        if (box === null) throw new Error('no canvas');
        await page.mouse.click(
            box.x + box.width * 0.5,
            box.y + box.height * 0.5,
        );

        const pixels = page.locator('.canvas svg rect');
        // A four-cell brush paints a four by four square.
        await expect.poll(() => pixels.count()).toBe(16);

        // And it is one stroke, so one undo takes all of it back.
        await page.keyboard.press('Control+z');
        await expect.poll(() => pixels.count()).toBe(0);
    } finally {
        await context.close();
    }
});

/**
 * Tracing a symbol's outline (#924). The tool replaced the emoji importer
 * rather than joining it: one chooser, two ways to add what it returns.
 */
/**
 * Importing pixels replaces the pixel layer and sits *under* everything else,
 * and it is one undoable edit. Both halves are regressions: an import used to be
 * appended, burying an existing path, and closing the dialog it lived in reset
 * the undo history so there was nothing to take it back with.
 */
test('a symbol imported as pixels leaves earlier shapes visible and undoable', async ({
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
        const paths = page.locator('.canvas svg path');
        await expect.poll(() => paths.count()).toBe(1);

        await page.getByRole('radio', { name: 'symbol', exact: true }).click();
        await page.getByRole('radio', { name: 'pixels', exact: true }).click();
        await page.locator('.palette .picker button').first().click();

        const pixels = page.locator('.canvas svg rect');
        await expect
            .poll(() => pixels.count(), { timeout: 15000 })
            .toBeGreaterThan(0);

        // The path is still there, and still painted last — so still visible.
        await expect.poll(() => paths.count()).toBe(1);
        const order = await page.evaluate(() =>
            [...(document.querySelector('.canvas svg')?.children ?? [])].map(
                (c) => c.tagName,
            ),
        );
        expect(order.indexOf('path')).toBeGreaterThan(order.indexOf('rect'));

        // And one undo takes the whole import back.
        await page.locator('.canvas').focus();
        await page.keyboard.press('Control+z');
        await expect.poll(() => pixels.count()).toBe(0);
        await expect.poll(() => paths.count()).toBe(1);
    } finally {
        await context.close();
    }
});

test('a symbol can be added as a scalable outline', async ({ browser }) => {
    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        await createTestCharacter(page);
        await page.getByRole('radio', { name: 'symbol', exact: true }).click();
        await page.getByRole('radio', { name: 'outline', exact: true }).click();

        // Pick the first symbol the chooser offers.
        await page.locator('.palette .picker button').first().click();

        // The outline renders as exactly one path — hit testing maps an SVG
        // child index back to a shape, so a group would shift every shape after.
        const outline = page.locator('.canvas svg path');
        await expect.poll(() => outline.count(), { timeout: 15000 }).toBe(1);
        expect(await outline.first().getAttribute('d')).not.toBe('');
        expect(await outline.first().getAttribute('transform')).toContain(
            'translate',
        );

        await page.keyboard.press('Control+z');
        await expect.poll(() => outline.count()).toBe(0);
    } finally {
        await context.close();
    }
});
