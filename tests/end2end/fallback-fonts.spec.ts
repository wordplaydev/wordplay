import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * Verifies browser-native lazy font fallback (static/fonts-fallback.css):
 * every Noto script face is declared with a unicode-range, so the browser
 * downloads a face only when rendered text intersects its range. Tofu
 * regression guard for the editor and the glyph chooser's script browser.
 *
 * `document.fonts.check(font, text)` is the assertion primitive: it returns
 * true only when every declared face matching the text's codepoints has
 * loaded — the no-tofu guarantee for those characters. Canvas width
 * comparisons would be flaky across platforms (macOS ships system fonts for
 * many scripts), so we assert on the font loading itself.
 */

/** Is the named face loaded for the given probe character? */
function faceLoadedFor(
    page: import('@playwright/test').Page,
    face: string,
    probe: string,
) {
    return page.evaluate(
        ({ face, probe }) => document.fonts.check(`12px "${face}"`, probe),
        { face, probe },
    );
}

test('typing Arabic in the editor lazily loads the Arabic fallback face', async ({
    page,
}) => {
    await createTestProject(page);

    // Nothing Arabic has rendered, so the face must not be loaded yet.
    expect(await faceLoadedFor(page, 'Noto Sans Arabic', 'ع')).toBe(false);

    // Type Arabic text into the editor; the code font chain ends with the
    // lazy fallbacks, so rendering it should trigger the Arabic slice.
    await page.locator('textarea.keyboard-input').first().focus();
    await page.keyboard.type('"مرحبا"');

    await expect
        .poll(() => faceLoadedFor(page, 'Noto Sans Arabic', 'ع'), {
            timeout: 10000,
        })
        .toBe(true);
});

test('filtering the glyph chooser by script lazily loads that script face', async ({
    page,
}) => {
    await createTestProject(page);

    expect(await faceLoadedFor(page, 'Noto Sans Cherokee', 'Ꭰ')).toBe(false);

    // Open the editor's character chooser.
    await page.locator('textarea.keyboard-input').first().focus();
    await page.getByText('😊').first().click();

    // Choose the Cherokee script filter; the chooser then renders every
    // Cherokee codepoint, which must pull in the Cherokee face.
    await page.locator('select:has(option[value="Cher"])').selectOption('Cher');

    await expect
        .poll(() => faceLoadedFor(page, 'Noto Sans Cherokee', 'Ꭰ'), {
            timeout: 10000,
        })
        .toBe(true);

    // Laziness: an unrelated script face must still be unloaded.
    const oghamLoaded = await page.evaluate(() =>
        Array.from(document.fonts).some(
            (face) =>
                face.family.replaceAll(/['"]/g, '') === 'Noto Sans Ogham' &&
                face.status === 'loaded',
        ),
    );
    expect(oghamLoaded).toBe(false);
});
