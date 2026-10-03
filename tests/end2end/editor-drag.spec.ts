import { expect, test, type Locator, type Page } from '@playwright/test';
import { createTestProject } from '../helpers/createProject';

/**
 * Dragging code in the editor, which no other spec exercises. One page load:
 * each test here is a step of the same session, since a page load is most of
 * what a Playwright test costs.
 */

/** Strip layout whitespace and the zero-width separators between tokens. */
function stripped(text: string): string {
    return text.replace(/[\s\u200b-\u200d\ufeff]/g, '');
}

async function center(locator: Locator): Promise<{ x: number; y: number }> {
    const box = await locator.boundingBox();
    if (box === null) throw new Error('no box');
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Shift+drag from one element toward another, running `beforeRelease` with
 *  the pointer down over the target. */
async function shiftDrag(
    page: Page,
    from: Locator,
    to: Locator,
    beforeRelease?: () => Promise<void>,
) {
    const start = await center(from);
    const end = await center(to);
    await page.keyboard.down('Shift');
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    // Past the 10px threshold that starts a drag, in steps so the editor sees
    // the pointer arrive rather than jump.
    await page.mouse.move(end.x, end.y, { steps: 12 });
    if (beforeRelease) await beforeRelease();
    await page.mouse.up();
    await page.keyboard.up('Shift');
}

test('a Shift+drag moves a node and says where it landed; Escape cancels and says so', async ({
    page,
}) => {
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    // A new project carries a template program; start from nothing.
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('a: _');
    await page.keyboard.press('Enter');
    await page.keyboard.type('5');

    const paced = page.locator('.announcements.paced');
    const five = editor.locator('.token-view', { hasText: '5' }).first();
    const placeholder = editor.locator('.token-view.placeholder').first();
    await expect(placeholder).toBeVisible();
    await expect(five).toBeVisible();

    // Move the number onto the placeholder.
    await shiftDrag(page, five, placeholder);
    await expect
        .poll(async () => stripped((await editor.textContent()) ?? ''))
        .toContain('a:5');
    await expect(editor.locator('.token-view.placeholder')).toHaveCount(0);
    // The drop is described: what moved and what now holds it.
    await expect(paced).toHaveAttribute('data-kind', 'edit', {
        timeout: 15000,
    });
    await expect(paced).toContainText(/moved/i);

    // Pick the number up again, then cancel with Escape before releasing.
    const moved = editor.locator('.token-view', { hasText: '5' }).first();
    const name = editor.locator('.token-view', { hasText: 'a' }).first();
    await shiftDrag(page, moved, name, async () => {
        await expect(paced).toContainText(/picked up/i, { timeout: 15000 });
        await page.keyboard.press('Escape');
    });
    // Nothing dropped, and the cancellation was heard.
    await expect(paced).toContainText(/dropped nothing/i, { timeout: 15000 });
    expect(stripped((await editor.textContent()) ?? '')).toContain('a:5');
});

/** Drag from an element to a locator that may move as the drag reshapes the
 *  layout (the sidebar and drop targets resize), converging on it. */
async function dragOnto(page: Page, from: Locator, to: Locator) {
    const start = await center(from);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let attempt = 0; attempt < 4; attempt++) {
        const target = await center(to);
        await page.mouse.move(target.x, target.y, { steps: 8 });
        await expect
            .poll(async () => {
                const now = await center(to);
                return Math.abs(now.x - target.x) + Math.abs(now.y - target.y);
            })
            .toBeLessThan(40);
    }
    const settled = await center(to);
    await page.mouse.move(settled.x, settled.y, { steps: 4 });
    await page.mouse.up();
}

test('in blocks mode, unparsable code takes a drop, the space below the program appends, and copying from the sidebar is said', async ({
    page,
    context,
}) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    // A program that is one stray token.
    await page.keyboard.type(')');
    await page.keyboard.press('ControlOrMeta+\\');

    const paced = page.locator('.announcements.paced');
    const unparsable = editor.locator('.node-view.UnparsableExpression');
    await expect(unparsable).toHaveCount(1);
    const concept = page.locator('.code .node').first();
    await expect(concept).toBeVisible();

    // Dropping on the unparsable code replaces it. The blocks list search
    // used to pick that node's own token list as the target, which no drop
    // survives, so a broken program could not be repaired by dragging.
    await dragOnto(page, concept, unparsable.first());
    await expect(unparsable).toHaveCount(0);
    await expect(paced).toHaveAttribute('data-kind', 'edit', {
        timeout: 15000,
    });
    await expect(paced).toContainText(/copied/i);

    // Releasing in the empty space below the program appends to it.
    const statements = editor.locator(
        '.node-view.root-block > .row > .row > .node-list > .node-view',
    );
    const before = await statements.count();
    /** A point under the last block and still inside the editor, measured
     *  live: the layout moves once a drag is under way. */
    const belowProgram = () =>
        page.evaluate(() => {
            const code = document.querySelector('[data-testid="editor"]');
            const list = code?.querySelector(
                '.node-view.root-block .node-list',
            );
            if (!code || !list) return null;
            const outer = code.getBoundingClientRect();
            const inner = list.getBoundingClientRect();
            return {
                // The middle of the visible code column: a wide block's own
                // left edge can sit under the sidebar.
                x: outer.x + outer.width / 2,
                y: Math.min(outer.bottom - 12, inner.bottom + 40),
            };
        });
    const from = await center(concept);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 20, from.y + 10, { steps: 4 });
    for (let attempt = 0; attempt < 3; attempt++) {
        const point = await belowProgram();
        if (point === null) throw new Error('no program to drop below');
        await page.mouse.move(point.x, point.y, { steps: 8 });
    }
    await expect(editor.locator('.insertion-feedback')).toHaveCount(1);
    await page.mouse.up();
    await expect.poll(async () => statements.count()).toBe(before + 1);

    // Copying a concept from the sidebar says what was copied.
    await concept.focus();
    await page.keyboard.press('ControlOrMeta+c');
    await expect(paced).toHaveAttribute('data-kind', 'command', {
        timeout: 15000,
    });
    await expect(paced).toContainText(/copied/i);
});
