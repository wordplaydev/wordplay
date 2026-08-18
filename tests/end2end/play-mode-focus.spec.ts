import { expect, test } from '../../playwright/fixtures';
import { grantClipboard } from '../helpers/clipboard';
import { createTestProject } from '../helpers/createProject';

/**
 * Switching to play mode with the editor still on screen has to hand keyboard focus
 * to the stage. It didn't: `setUIMode` surfaced the mode's subject tile but never
 * moved focus, so focus stayed in the editor's invisible full-size textarea. The
 * next keystroke matched the catch-all `InsertSymbol` command, and the editor's
 * `requestEditable` escape hatch both inserted the character AND flipped the project
 * back to edit — so a key typed "in play mode" edited the source and never reached
 * the program (#1285).
 *
 * A fresh project is used rather than a gallery example: an example is read-only, so
 * `requestEditable` is undefined there and the source could not change either way,
 * which would make the central assertion vacuous.
 */
test('a key typed after switching to play reaches the stage, not the source', async ({
    page,
}) => {
    test.setTimeout(60000);

    await grantClipboard(page);
    await createTestProject(page);

    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');

    // Paste rather than type: the editor's delimiter auto-close mangles typed
    // brackets and quotes.
    const code = 'Phrase(Key())';
    await page.evaluate(
        (source) => navigator.clipboard.writeText(source),
        code,
    );
    await page.keyboard.press('ControlOrMeta+v');
    await expect
        .poll(async () => (await editor.textContent()) ?? '', {
            message: 'source did not load into the editor',
        })
        .toContain('Key');

    // Wait for the program to have actually run before switching modes: the
    // rendered Phrase is what says the evaluation reached `Key()` and created its
    // stream, and a key pressed before that stream exists reaches nothing.
    await expect(page.locator('.output .value .phrase')).toHaveCount(1);

    const before = (await editor.textContent()) ?? '';

    // Switch to play the way a creator does, which leaves the editor visible —
    // modes deliberately don't change the layout. ProjectModes is
    // ['edit', 'debug', 'play'], so play is the third radio.
    const modes = page.locator(
        '[data-uiid="modeSwitcher"] button[role="radio"]',
    );
    await modes.nth(2).click();
    await expect(modes.nth(2)).toHaveAttribute('aria-checked', 'true');

    // Deliberately no .focus() call. Focus arriving in the stage on its own is the
    // fix: before it, focus stayed in the editor's invisible textarea, or fell to
    // the body when the tile re-rendered, and a keystroke either edited the source
    // or was lost entirely. The focus move is deferred a tick (the mode may have
    // just expanded a tile that wasn't rendered), so poll rather than read once.
    await expect
        .poll(
            () =>
                page.evaluate(
                    () => document.activeElement?.closest('.output') !== null,
                ),
            {
                message:
                    'focus never reached the stage after switching to play',
            },
        )
        .toBe(true);

    // Press until the program answers. The stage drops keys until the evaluator
    // has resumed, which happens shortly after the mode switch with no DOM signal
    // to wait on, and a creator pressing a key that does nothing yet would press
    // again too. Repeating is also what makes the pre-fix failure loud: with focus
    // still in the editor these would pile up as inserted characters, which the
    // source assertion below catches.
    await expect
        .poll(
            async () => {
                await page.keyboard.press('q');
                return (
                    (await page
                        .locator('.output .value')
                        .first()
                        .textContent()) ?? ''
                );
            },
            { message: 'the key never reached the running program' },
        )
        .toContain('q');

    // ...the source is untouched...
    await expect
        .poll(async () => (await editor.textContent()) ?? '', {
            message:
                'the keystroke edited the source instead of reaching the stage',
        })
        .toBe(before);

    // ...and the project is still playing, not the edit mode the escape hatch
    // flips to when a keystroke reaches a read-only editor.
    await expect(modes.nth(2)).toHaveAttribute('aria-checked', 'true');
});
