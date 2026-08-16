import { expect, test } from '../../playwright/fixtures';
import { grantClipboard } from '../helpers/clipboard';
import { createTestProject } from '../helpers/createProject';

/**
 * Folding is only real if the collapsed content leaves the DOM: that's what the
 * caret machinery reads (`foldedCaret.renderedTokenIds`), and it's what a
 * creator sees. A fold control that flips its own chevron and hides nothing is
 * indistinguishable from a broken button — which is exactly what a doc's control
 * did while the fold lived on `Docs` (a list of per-language translations) whose
 * collapsed branch re-rendered its first `Doc` whole.
 */

const DOC_PROJECT = `¶Welcome to your blank project! This is a comment.
You can use it to describe your project, take notes, and
explain what you want people to know about your work.¶
Phrase('hi')`;

/** The editor renders zero-width spaces between tokens and non-breaking spaces
 *  for source space; normalize both so the text can be compared to the code. */
async function sourceOf(page: Parameters<typeof createTestProject>[0]) {
    const text = await page.getByTestId('editor').first().textContent();
    return (text ?? '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\u00A0/g, ' ');
}

test('collapsing a doc hides its text, and expanding brings it back', async ({
    page,
}) => {
    test.setTimeout(60000);

    await grantClipboard(page);
    await createTestProject(page);

    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.evaluate(
        (code) => navigator.clipboard.writeText(code),
        DOC_PROJECT,
    );
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => sourceOf(page)).toContain('Welcome to your blank');

    // The doc spans lines, so it — and nothing else here — offers a fold control.
    const chevron = editor.locator('button.fold-button', { hasText: '›' });
    await expect(chevron).toHaveCount(1);
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
    // Named for the Doc, not its Docs parent ("explanation list").
    await expect(chevron).toHaveAttribute('aria-label', 'collapse explanation');

    await chevron.click();

    // The assertion the old code failed: the doc's words are gone from the DOM,
    // leaving the delimiters and the ellipsis.
    await expect
        .poll(() => sourceOf(page))
        .not.toContain('Welcome to your blank');
    await expect.poll(() => sourceOf(page)).toContain('¶…¶');
    await expect(chevron).toHaveAttribute('aria-expanded', 'false');

    // The ellipsis is the expand control, and names the node too (it used to
    // announce the literal template, "expand $name").
    const ellipsis = editor.locator('button.fold-button', { hasText: '…' });
    await expect(ellipsis).toHaveAttribute('aria-label', 'expand explanation');

    await ellipsis.click();
    await expect.poll(() => sourceOf(page)).toContain('Welcome to your blank');
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
});

test('a single line doc offers no fold control', async ({ page }) => {
    test.setTimeout(60000);

    await grantClipboard(page);
    await createTestProject(page);

    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.evaluate(() =>
        navigator.clipboard.writeText(`¶One line.¶\nPhrase('hi')`),
    );
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => sourceOf(page)).toContain('One line.');

    // Nothing would be hidden, so there's nothing to click.
    await expect(editor.locator('button.fold-button')).toHaveCount(0);
});
