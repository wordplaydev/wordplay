import { expect, test } from '@playwright/test';
import { createTestProject } from '../helpers/createProject';

/** Strip layout whitespace and the zero-width separators between tokens. */
function stripped(text: string): string {
    return text.replace(/[\s\u200b-\u200d\ufeff]/g, '');
}

/**
 * The autocomplete menu, driven from the keyboard. One page load: the menu is
 * opened at a name, narrowed by typing, chosen from, and the result undone,
 * each step asserting what a screen reader is told.
 */
test('the menu opens at a name, narrows as it is typed, is chosen from, and is undone audibly', async ({
    page,
}) => {
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('Ph');

    const paced = page.locator('.announcements.paced');
    const menu = page.locator('.menu .revisions');

    // Opening says how many suggestions there are; focus stays in the code.
    await page.keyboard.press('ControlOrMeta+ArrowDown');
    await expect(menu).toBeVisible();
    // The count line and then the selected item both arrive on the `menu`
    // kind; which one is showing when we look is a race, so assert the kind.
    await expect(paced).toHaveAttribute('data-kind', 'menu', {
        timeout: 15000,
    });
    const before = await menu.locator('[role="menuitem"]').count();
    expect(before).toBeGreaterThan(0);
    await expect(page.locator('textarea.keyboard-input')).toBeFocused();

    // Typing narrows the open menu rather than closing it.
    await page.keyboard.type('r');
    await expect(menu).toBeVisible();
    await expect
        .poll(async () => menu.locator('[role="menuitem"]').count())
        .toBeLessThanOrEqual(before);
    await expect(menu.locator('[role="menuitem"]').first()).toContainText(
        /Phr/,
    );

    // Down enters the menu; Enter then chooses, and the caret names what was
    // added.
    await page.keyboard.press('ArrowDown');
    await expect(menu.locator('.revision.selected')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect
        .poll(async () => stripped((await editor.textContent()) ?? ''))
        .toContain('Phrase');
    await expect(page.locator('.announcements.immediate')).toHaveAttribute(
        'data-kind',
        'caret',
        { timeout: 15000 },
    );

    // An undo is said with the caret, on the immediate channel, so the
    // screen reader's own echo of the field changing can't bury it.
    const immediate = page.locator('.announcements.immediate');
    await page.keyboard.press('ControlOrMeta+z');
    await expect(immediate).toContainText(/undone/i, { timeout: 15000 });

    // Undoing the same character three times is three different sentences:
    // the span alone ("1 is gone") repeated, and a repeat is heard as nothing.
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('111');
    const heard: string[] = [];
    for (let undo = 0; undo < 3; undo++) {
        const before = await immediate.textContent();
        await page.keyboard.press('ControlOrMeta+z');
        await expect
            .poll(async () => immediate.textContent(), { timeout: 15000 })
            .not.toEqual(before);
        await expect(immediate).toContainText(/undone/i);
        heard.push((await immediate.textContent()) ?? '');
    }
    expect(new Set(heard).size).toBe(3);
    // Each says where the caret is now, never the token that was undone
    // away: the caret kept the last-added node and named it after every undo.
    for (const said of heard) expect(said).not.toContain('111');

    // Arrows navigate the menu, visibly. Its selection used to be drawn only
    // from focus, which a live menu never has, so Down and Up moved a
    // selection nothing showed and only the pointer seemed to work.
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    for (const line of ['abcd: 1', 'abc: 1', 'ab: 1']) {
        await page.keyboard.type(line);
        await page.keyboard.press('Enter');
    }
    await page.keyboard.type('a');
    const selected = menu.locator('.revision.selected');
    const lastToken = async () =>
        (await editor.locator('.token-view').allTextContents())
            .map((text) => stripped(text))
            .filter((text) => text.length > 0)
            .at(-1);

    // It opens with nothing selected, so Enter is still a new line.
    await page.keyboard.press('ControlOrMeta+ArrowDown');
    await expect(menu).toBeVisible();
    await expect(selected).toHaveCount(0);
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await page.keyboard.press('Backspace');

    // Down enters it, Down and Up move, and Up from the first item leaves.
    await page.keyboard.press('ControlOrMeta+ArrowDown');
    await expect(menu).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(selected).toHaveCount(1);
    await expect(selected).toBeVisible();
    const first = await selected.textContent();
    await page.keyboard.press('ArrowDown');
    await expect(selected).toHaveCount(1);
    await expect.poll(async () => selected.textContent()).not.toEqual(first);
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => selected.textContent()).toEqual(first);
    await page.keyboard.press('ArrowUp');
    await expect(selected).toHaveCount(0);
    await expect(menu).toBeVisible();

    // Escape dismisses without changing the code.
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    expect(await lastToken()).toBe('a');

    // Down then Enter chooses the first suggestion, completing the name.
    await page.keyboard.press('ControlOrMeta+ArrowDown');
    await expect(menu).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect.poll(lastToken).toMatch(/^ab(c|cd)?$/);

    // Opened from the toolbar with the pointer, the keys still reach it:
    // focus goes to the code, not left on the button.
    // A fresh `a` to complete: the finished name above has nothing left to
    // suggest, since a name is no longer offered as its own completion.
    await page.keyboard.press('Enter');
    await page.keyboard.type('a');
    // The toolbar's button, by its glyph: the code's own ▾ triggers share its
    // description, and they open the other, focus-taking kind of menu.
    await page
        .locator('button')
        .filter({ hasText: /^\s*▾\s*$/ })
        .first()
        .click();
    await expect(menu).toBeVisible();
    await expect(page.locator('textarea.keyboard-input')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    // Whatever kind of entry is first here (a suggestion, a group, an action).
    await expect(menu.locator('.selected')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
});
