import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * Stress test for the editor's render layer: the crash class fixed alongside
 * this test was an undefined dereference during editing, caused by node views
 * resolving their `node` through lazy deriveds that can transiently read as
 * undefined mid-flush while the immutable AST is swapped on every keystroke
 * (see NodeView's renderNode latch and the boundary around RootView in
 * Editor.svelte). No single input reproduces it deterministically, so we drive
 * a long, varied sequence of insertions, deletions, pastes, undos, and
 * text/blocks-mode toggles and assert the page never throws — the editor must
 * never crash while editing.
 *
 * The `/en-US` fragments matter: `dash` is a field of Language/PatternRange/
 * PatternQuantifier, the node types the production `reading 'dash'` crash came
 * from, so typing language tags exercises exactly that view.
 */

/** Deterministic PRNG (mulberry32) so a failure reproduces from the same seed. */
function makeRandom(seed: number): () => number {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Wordplay-shaped fragments that exercise many node/token view types. */
const FRAGMENTS = [
    'Phrase("hi")',
    '1 + 2 × 3',
    '“hello”/en-US',
    'ƒ(x•#) x + 1',
    '[1 2 3]',
    '{1: "a" 2: "b"}',
    '↑ x: 1',
    'x: 1\n',
    'when x = 1 "yes" "no"',
    'Group(Stack() Phrase("a") Phrase("b"))',
    '/en-US',
    '/ja',
    '•#m',
    'π + ∞',
];

test('rapid editing never crashes the editor', async ({ page }) => {
    // The fuzz loop drives dozens of edits with real reparse/round-trips, well
    // past the default 60s per-test budget.
    test.setTimeout(240_000);

    // Two signals cover the whole crash class: an uncaught pageerror (a throw on
    // the mutation/caret path, outside the render boundary) and a render crash
    // the boundary contained (logged with the [editor-render-error] prefix).
    // Other console.error noise (e.g. the emulator's PresenceTracker permission
    // warnings) is unrelated and must not fail the test.
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? String(error)));
    page.on('console', (message) => {
        if (
            message.type() === 'error' &&
            message.text().includes('[editor-render-error]')
        )
            errors.push(message.text());
    });

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.waitFor();
    await expect(editor).not.toHaveClass(/readonly/, { timeout: 15000 });

    const textarea = page.locator('textarea.keyboard-input').first();
    await textarea.focus();

    const clearAll = async () => {
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Backspace');
    };

    const random = makeRandom(0x5eed);

    // Each edit reparses/re-renders the whole source, so an insert-biased loop
    // would grow the tree until every keystroke is slow; clear periodically to
    // keep the tree small and every op fast while still covering the crash path.
    for (let i = 0; i < 24; i++) {
        if (i % 4 === 0) await clearAll();

        const roll = random();
        if (roll < 0.5) {
            // Insert a burst with no delay to maximize mid-flush overlap.
            const fragment =
                FRAGMENTS[Math.floor(random() * FRAGMENTS.length)];
            await page.keyboard.type(fragment, { delay: 0 });
        } else if (roll < 0.65) {
            // Select all, copy, move, then paste — exercises the paste path
            // (Ctrl+V is the internal-clipboard fast path).
            await page.keyboard.press('ControlOrMeta+a');
            await page.keyboard.press('ControlOrMeta+c');
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('ControlOrMeta+v');
        } else if (roll < 0.8) {
            // A run of deletions from wherever the caret is.
            const count = 1 + Math.floor(random() * 4);
            for (let d = 0; d < count; d++)
                await page.keyboard.press('Backspace');
        } else if (roll < 0.9) {
            await page.keyboard.press('ControlOrMeta+z');
        } else {
            // Toggle text/blocks mode — blocks mode renders empty-field
            // placeholders (the EmptyView/tuple path most prone to the crash).
            // The currently-selected mode button is aria-disabled, so click the
            // other one to flip modes.
            await page
                .locator(
                    '[data-uiid="textBlocksToggle"] button[role="radio"][aria-checked="false"]',
                )
                .click();
            await textarea.focus();
        }

        // Nudge the caret so the next op starts somewhere fresh.
        await page.keyboard.press(random() < 0.5 ? 'ArrowLeft' : 'ArrowDown');
    }

    // Let the final flush settle, then assert the editor is alive (its boundary
    // fallback replaces content with an error tile) and that nothing threw.
    await page.waitForTimeout(300);
    await expect(editor).not.toContainText('Oops, there was an error');
    expect(errors, `Editor errors during fuzz:\n${errors.join('\n\n')}`).toEqual(
        [],
    );

    // Confirm the editor still accepts input after the whole run. Force text
    // mode first (the fuzz may have left it in blocks mode, where typing behaves
    // differently), clear, and type a bare number literal — valid at the program
    // root in any state, so it can't be rejected as a conflict.
    const textModeButton = page
        .locator('[data-uiid="textBlocksToggle"] button[role="radio"]')
        .first();
    if ((await textModeButton.getAttribute('aria-checked')) === 'false')
        await textModeButton.click();
    await textarea.focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('42', { delay: 0 });
    await expect(editor).toContainText('42', { timeout: 10_000 });
});
