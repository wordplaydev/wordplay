import { expect, test } from '../../playwright/fixtures';
import { expectNoAxeViolations } from '../helpers/checkAccessibility';
import { grantClipboard } from '../helpers/clipboard';
import { createTestProject } from '../helpers/createProject';

/**
 * A source can be shown in two views at once, so a program written in two
 * languages can be read side by side instead of by switching a dropdown
 * (#534). These claims are all about the browser, so they can't be made
 * cheaper: the second view's share of the layout is CSS geometry, and the
 * language filter hides tokens by zeroing their boxes rather than removing
 * them, so only a real layout can say what is actually painted.
 *
 * One test, one page load. The layout arithmetic itself — that a second
 * `TileKind.Source` tile subdivides only the source band — is pinned far more
 * cheaply in `Layout.test.ts`; this is here to prove the wiring around it.
 */
const BILINGUAL = `word/en,palabra/es: 'hello'/en'hola'/es
Phrase(word)`;

/* Taller than the default 1280x720, whose canvas — the viewport less the app's
   own chrome — falls under the 600px the responsive arrangement treats as a
   tablet and so resolves to the two-tile arrangement. The geometry assertions
   below are about the many-tile arrangements, where the two views divide the
   source band and the stage keeps its place; the two-tile case is checked at
   the end of the test by shrinking the window. */
test.use({ viewport: { width: 1400, height: 1000 } });

/** What a view actually paints. A hidden token keeps its text in the DOM at
 *  zero size so the caret can still land on it, so `textContent` cannot tell
 *  the two views apart. */
async function paintedText(page: import('@playwright/test').Page, id: string) {
    return page
        .locator(`.tile[data-id="${id}"] [data-testid="editor"]`)
        .evaluate((editor) =>
            Array.from(editor.querySelectorAll('.token-view'))
                .filter(
                    (token) =>
                        token.closest('.hide') === null &&
                        token.getBoundingClientRect().width > 0,
                )
                .map((token) => token.textContent)
                .join('')
                .replace(/[​-‍﻿]/g, '')
                .replace(/ /g, ' '),
        );
}

test('a source can be shown in two languages at once', async ({ page }) => {
    test.setTimeout(90000);

    await grantClipboard(page);
    await createTestProject(page);

    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.evaluate(
        (code) => navigator.clipboard.writeText(code),
        BILINGUAL,
    );
    await page.keyboard.press('ControlOrMeta+v');

    // Both languages have to be in the program before either can be chosen.
    const primaryChooser = page.locator('#code-locale-source0');
    await expect(primaryChooser.locator('option')).toHaveCount(3);

    const stageBefore = await page.getByTestId('tile-output').boundingBox();
    const sourceBefore = await page.getByTestId('tile-source0').boundingBox();

    await page.locator('[data-uiid="addSourceView"]').first().click();

    const view = page.getByTestId('tile-source0.1');
    await expect(view).toBeVisible();

    // The control lives beside the chooser it relates to, not in the tile's
    // corner, so the connection between them is inferrable.
    await expect(
        page.locator(
            '[data-uiid="editorToolbar"] [data-uiid="closeSourceView"]',
        ),
    ).toHaveCount(2);
    await expect(
        page.locator('.tile-controls [data-uiid="closeSourceView"]'),
    ).toHaveCount(0);

    // The second view takes half of the source band, and nothing else moves —
    // the property that makes a view a tile rather than a pane.
    const sourceAfter = await page.getByTestId('tile-source0').boundingBox();
    const viewBox = await view.boundingBox();
    const stageAfter = await page.getByTestId('tile-output').boundingBox();
    expect(stageAfter).toEqual(stageBefore);
    expect(sourceAfter?.width).toBeCloseTo((sourceBefore?.width ?? 0) / 2, 0);
    expect(viewBox?.width).toBeCloseTo((sourceBefore?.width ?? 0) / 2, 0);

    // Each view has its own chooser, with its own id: duplicate ids on
    // focusable elements are an accessibility violation.
    const viewChooser = page.locator('#code-locale-source0\\.1');
    await expect(viewChooser).toBeVisible();

    // A split assigns the two views different languages on its own: showing one
    // language twice says nothing, and a view with none chosen renders the
    // source verbatim, so nothing would be localized either.
    await expect(primaryChooser).toHaveValue('en');
    await expect(viewChooser).toHaveValue('es');

    // The point of the feature: the same code, painted in two languages. Asserted
    // on the reference rather than on the declaration, because a caret inside a
    // multilingual name reveals every language of it — each view has its own
    // caret, and both start at the top of the file, which is inside the names.
    await expect
        .poll(() => paintedText(page, 'source0'))
        .toContain('Phrase(word)');
    // Both the creator's name and the built-in one localize — a program half in
    // Spanish would defeat the point of reading it in Spanish. `Frase` comes
    // from a basis built for Spanish: this project only *tags* Spanish, so its
    // own basis holds no Spanish name at all.
    await expect
        .poll(() => paintedText(page, 'source0.1'))
        .toContain('Frase(palabra)');
    expect(await paintedText(page, 'source0')).not.toContain('Frase');

    // A token shown under another name has no interior position a source offset
    // could name, so a click resolves to one of its edges rather than landing
    // on whatever character happens to sit under the pointer.
    const localized = page
        .locator('.tile[data-id="source0.1"] [data-testid="editor"]')
        .locator('.token-view[data-synthetic]', { hasText: 'Frase' })
        .first();
    const box = await localized.boundingBox();
    if (box === null) throw new Error('No box for the localized name.');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const start = BILINGUAL.indexOf('Phrase');
    // Reported as a word rather than a number so a failure says "interior (23)"
    // instead of comparing two integers. Either edge is right; which one depends
    // on which half of the name was clicked.
    await expect
        .poll(async () => {
            const at = await page
                .locator('.tile[data-id="source0.1"] textarea.keyboard-input')
                .evaluate((field) =>
                    field instanceof HTMLTextAreaElement
                        ? field.selectionStart
                        : -1,
                );
            return at === start
                ? 'start'
                : at === start + 'Phrase'.length
                  ? 'end'
                  : `interior (${at})`;
        })
        .toMatch(/^(start|end)$/);

    // Two editors with the same name are indistinguishable to a screen reader,
    // so each says which language it shows.
    await expect(
        page.locator('.tile[data-id="source0"] [data-testid="editor"]'),
    ).toHaveAttribute('aria-label', /English/);
    await expect(
        page.locator('.tile[data-id="source0.1"] [data-testid="editor"]'),
    ).toHaveAttribute('aria-label', /español|Español/);

    // Only the source's own tile carries the annotations sidebar: two would
    // list identical conflicts, and the conflicts come from that editor.
    await expect(
        page.locator('.tile[data-id="source0.1"] .annotations'),
    ).toHaveCount(0);

    // Blurred first: `select:focus` paints white on the focus blue at 4:1
    // everywhere in the app, which reproduces on a single unsplit editor and is
    // the Options widget's to fix, not this feature's. Scanning with a chooser
    // still focused would report that instead of anything about the split.
    await page.locator('body').click({ position: { x: 2, y: 2 } });
    await expectNoAxeViolations(page);

    // Closing from the source's own tile keeps the language being read, so the
    // ✕ means the same thing in both tiles.
    await page
        .locator('.tile[data-id="source0"] [data-uiid="closeSourceView"]')
        .click();
    await expect(view).toHaveCount(0);
    await expect(primaryChooser).toHaveValue('es');

    // A split is per-session: it never reaches the persisted layout.
    await page.locator('[data-uiid="addSourceView"]').first().click();
    await expect(page.getByTestId('tile-source0.1')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('tile-source0')).toBeVisible();
    await expect(page.getByTestId('tile-source0.1')).toHaveCount(0);

    // A window this size is an ordinary laptop, and its canvas falls under the
    // tablet threshold — so the control has to be there, and a split has to
    // show both views rather than the new one displacing its own source.
    await page.setViewportSize({ width: 1280, height: 720 });
    const control = page.locator('[data-uiid="addSourceView"]').first();
    await expect(control).toBeVisible();
    await control.click();
    await expect(page.getByTestId('tile-source0')).toBeVisible();
    await expect(page.getByTestId('tile-source0.1')).toBeVisible();
});
