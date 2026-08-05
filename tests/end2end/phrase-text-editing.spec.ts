import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * Editing a phrase's text on stage must behave like a text field. It doesn't come for free:
 * every keystroke revises the program, which gives the creator Evaluate a new node id, which
 * changes the name GroupView keys its children by — so the whole PhraseView is destroyed and
 * rebuilt between one character and the next, taking the field's focus and caret with it.
 */

/** The palette shares a split with the output tile; at the default 1280×720 it takes the
 *  stage's place when it opens and the phrase leaves the DOM. */
test.use({ viewport: { width: 1600, height: 1000 } });

/** The editor renders zero-width spaces between tokens; strip them to compare source. */
async function sourceOf(page: Parameters<typeof createTestProject>[0]) {
    const text = await page.getByTestId('editor').first().textContent();
    return (text ?? '').replace(/​/g, '');
}

test('typing in a phrase on stage inserts in order, without accumulating quotes', async ({
    page,
}) => {
    test.setTimeout(60000);

    await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);

    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.evaluate(() => navigator.clipboard.writeText("Phrase('ab')"));
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => sourceOf(page)).toContain("Phrase('ab')");

    // First double-click opens the palette and selects; the second enters the text field.
    // Wait for the selection between them: opening the palette re-renders the phrase, and
    // a second click that lands before that settles hits an element on its way out.
    const phrase = page.locator('.output.phrase').first();
    await phrase.dblclick({ force: true });
    await expect(page.getByTestId('palette')).toBeVisible({ timeout: 8000 });
    await expect(phrase).toHaveClass(/\bselected\b/, { timeout: 8000 });
    await phrase.dblclick({ force: true });

    const field = page.locator('.output.phrase input');
    await expect(field).toBeVisible({ timeout: 8000 });
    // The field edits the characters, not the source form — no delimiters in it.
    await expect(field).toHaveValue('ab');

    // Entering puts the caret at 0, so this inserts before the existing text — in order.
    await page.keyboard.type('xyz', { delay: 150 });
    await expect(field).toHaveValue('xyzab', { timeout: 8000 });
    await expect.poll(() => sourceOf(page)).toContain("Phrase('xyzab')");

    // An apostrophe is ordinary text: the literal must re-delimit rather than end early.
    await page.keyboard.type("'", { delay: 150 });
    await expect(field).toHaveValue("xyz'ab", { timeout: 8000 });
    await expect.poll(() => sourceOf(page)).toContain(`Phrase("xyz'ab")`);

    // Escape leaves the field but keeps the phrase selected.
    await page.keyboard.press('Escape');
    await expect(field).toHaveCount(0, { timeout: 8000 });
    await expect(phrase).toHaveClass(/\bselected\b/);
});

test('a formatted phrase opens the palette rather than a plain text field', async ({
    page,
}) => {
    test.setTimeout(60000);

    await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);

    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.evaluate(() =>
        navigator.clipboard.writeText('Phrase(`*hi* there`)'),
    );
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => sourceOf(page)).toContain('*hi*');
    const before = await sourceOf(page);

    const phrase = page.locator('.output.phrase').first();
    await phrase.dblclick({ force: true });
    await expect(page.getByTestId('palette')).toBeVisible({ timeout: 8000 });
    await expect(phrase).toHaveClass(/\bselected\b/, { timeout: 8000 });
    await phrase.dblclick({ force: true });

    // No inline field: a plain field would flatten the markup into a TextLiteral on the
    // first keystroke. The palette edits markup properly instead.
    await expect(page.locator('.output.phrase input')).toHaveCount(0);
    await page.keyboard.type('zzz', { delay: 150 });
    await expect.poll(() => sourceOf(page)).toBe(before);
});
