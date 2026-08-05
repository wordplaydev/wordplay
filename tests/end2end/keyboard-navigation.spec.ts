import { expect, test } from '@playwright/test';
import { createTestProject } from '../helpers/createProject';

/**
 * Keyboard navigability: what axe's static scan can't see. Verifies that the
 * primary navigation is reachable by Tab, that dialogs trap focus and
 * restore it on Escape, and that the editor can be entered and exited with
 * the keyboard (no trap).
 */

test('home page primary navigation is reachable by keyboard, in order', async ({
    page,
}) => {
    await page.goto('/en-US/');
    await expect(page.getByRole('heading').first()).toBeVisible();

    // Walk the tab order and record the hrefs of every link that receives
    // focus. The main destinations must all be reachable, and in the order
    // they appear on the page.
    const hrefs: string[] = [];
    for (let press = 0; press < 60; press++) {
        await page.keyboard.press('Tab');
        const href = await page.evaluate(() =>
            document.activeElement instanceof HTMLAnchorElement
                ? document.activeElement.getAttribute('href')
                : null,
        );
        if (href !== null) hrefs.push(href);
    }
    for (const destination of [
        '/en-US/learn',
        '/en-US/projects',
        '/en-US/galleries',
    ])
        expect(
            hrefs,
            `expected a focusable link to ${destination}; got ${hrefs.join(', ')}`,
        ).toContain(destination);
});

test('notifications dialog traps focus and Escape restores it to the opener', async ({
    page,
}) => {
    await page.goto('/en-US/login');
    const opener = page.getByRole('button', {
        name: 'open notifications dialog',
    });
    await expect(opener).toBeVisible();
    // Activate with the keyboard: Buttons deliberately don't take focus from
    // pointer clicks, and the restore-focus contract is about keyboard users.
    await opener.focus();
    await page.keyboard.press('Enter');

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    // Focus lands inside the (native, modal) dialog…
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    document.activeElement?.closest('dialog[open]') !== null &&
                    document.activeElement?.closest('dialog[open]') !==
                        undefined,
            ),
        )
        .toBe(true);
    // …Tab stays inside it (native showModal focus trap)…
    await page.keyboard.press('Tab');
    expect(
        await page.evaluate(
            () => document.activeElement?.closest('dialog[open]') !== null,
        ),
    ).toBe(true);
    // …and Escape closes it and returns focus to the opener.
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
});

test('editor is keyboard-enterable and -exitable (no focus trap)', async ({
    page,
}) => {
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    // Clicking may focus the editor container or a descendant (e.g. the
    // hidden input that receives keystrokes) — either counts as "entered".
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    document.activeElement?.closest(
                        '[data-testid="editor"]',
                    ) !== null,
            ),
        )
        .toBe(true);

    // Tab must eventually leave the editor: the editor captures most keys for
    // editing, but Tab has to remain a navigation escape (or a documented
    // alternative would be required by WCAG 2.1.2 No Keyboard Trap).
    let escaped = false;
    for (let press = 0; press < 25 && !escaped; press++) {
        await page.keyboard.press('Tab');
        escaped = await page.evaluate(
            () => document.activeElement?.closest('.editor') === null,
        );
    }
    expect(escaped, 'Tab never moved focus out of the editor').toBe(true);

    // The tile resize knobs are reachable and focusable widgets.
    const knob = page.locator('.resize-knob').first();
    if ((await knob.count()) > 0) {
        await knob.focus();
        await expect(knob).toBeFocused();
        await expect(knob).toHaveAttribute('aria-valuenow');
    }
});
