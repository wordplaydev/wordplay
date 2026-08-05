import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * Output selection and the chrome that draws it belong to the palette: with the palette
 * closed the stage renders clean, nothing on it is selectable, and a double-click is the
 * way in — it opens the palette and selects whatever it landed on.
 */

/** The palette shares a split with the output tile, so at the default 1280×720 the palette
 *  takes the stage's place when it opens and the output leaves the DOM entirely. These
 *  tests need both on screen at once. */
test.use({ viewport: { width: 1600, height: 1000 } });

/** Load a program into the editor. Paste rather than type: the editor's delimiter
 *  auto-close mangles typed brackets and quotes. */
async function loadCode(
    page: Parameters<typeof createTestProject>[0],
    code: string,
) {
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.evaluate(
        (source) => navigator.clipboard.writeText(source),
        code,
    );
    await page.keyboard.press('ControlOrMeta+v');
    await expect
        .poll(async () => (await editor.textContent()) ?? '', {
            message: 'source did not load into the editor',
        })
        .toContain('Phrase');
}

test('output chrome and selection need the palette open', async ({ page }) => {
    test.setTimeout(60000);

    await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);
    await loadCode(page, "Phrase('hi')");

    const phrase = page.locator('.output.phrase').first();
    await expect(phrase).toBeVisible({ timeout: 8000 });

    // `.editing` on the stage is what every ring, handle, and move cursor keys off.
    const editingStage = page.locator('.stage.editing');
    await expect(editingStage).toHaveCount(0);

    // A single click selects nothing while the palette is closed.
    await phrase.click({ force: true });
    await expect(phrase).not.toHaveClass(/\bselected\b/);
    await expect(editingStage).toHaveCount(0);

    // A double click is the way in: it opens the palette AND selects what it hit.
    await phrase.dblclick({ force: true });
    await expect(page.getByTestId('palette')).toBeVisible({ timeout: 8000 });
    await expect(phrase).toHaveClass(/\bselected\b/, { timeout: 8000 });
    await expect(editingStage).toHaveCount(1);

    // Closing the palette takes the selection and the chrome with it.
    await page.locator('[data-uiid="paletteExpand"]').click();
    await expect(page.getByTestId('palette')).toHaveCount(0, { timeout: 8000 });
    await expect(phrase).not.toHaveClass(/\bselected\b/);
    await expect(editingStage).toHaveCount(0);
});

test('an unselected output border is dashed, a selected one glows', async ({
    page,
}) => {
    test.setTimeout(60000);

    await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);
    await loadCode(page, "Group(Stack() [Phrase('hi') Phrase('there')])");

    // Open the palette by double-clicking on stage. Which of the nested outputs the hit
    // test lands on doesn't matter here — the group and its two phrases give us both a
    // selected ring and unselected ones either way.
    const first = page.locator('.output.phrase').first();
    await expect(first).toBeVisible({ timeout: 8000 });
    await first.dblclick({ force: true });
    await expect(page.getByTestId('palette')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.stage.editing .output.selected')).toHaveCount(
        1,
        { timeout: 8000 },
    );

    // The rings live on an ::after overlay, so read the pseudo-element's computed style.
    // Selected uses box-shadow (only it can blur); unselected uses outline (only it can dash).
    const rings = await page.evaluate(() =>
        Array.from(
            document.querySelectorAll(
                '.stage.editing.interactive .phrase, .stage.editing.interactive .group:not(.root)',
            ),
        ).map((el) => {
            const after = getComputedStyle(el, '::after');
            return {
                selected: el.classList.contains('selected'),
                outlineStyle: after.outlineStyle,
                glowing: after.boxShadow !== 'none',
            };
        }),
    );

    // Both states must actually be represented, or the loop below proves nothing.
    expect(rings.filter((ring) => ring.selected).length).toBe(1);
    expect(rings.filter((ring) => !ring.selected).length).toBeGreaterThan(0);
    for (const ring of rings) {
        if (ring.selected) {
            expect(ring.glowing).toBe(true);
            // The dashes must be cleared, or they show through under the glow.
            expect(ring.outlineStyle).toBe('none');
        } else {
            expect(ring.outlineStyle).toBe('dashed');
            expect(ring.glowing).toBe(false);
        }
    }
});

test('an empty phrase is visible and laid out like any other', async ({
    page,
}) => {
    test.setTimeout(60000);

    await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);
    await loadCode(page, "Phrase('')");

    // An empty phrase measures 0x0 with nothing to draw, and fitting 0x0 used to solve
    // to a focus z of 0 — the camera in the output's own plane — which rendered the
    // stage blank. It's measured as a placeholder while the palette is open instead.
    await page.locator('[data-uiid="paletteExpand"]').click();
    await expect(page.getByTestId('palette')).toBeVisible({ timeout: 8000 });

    const phrase = page.locator('.output.phrase').first();
    await expect(phrase).toHaveCount(1, { timeout: 8000 });

    const box = await phrase.boundingBox();
    const stage = await page.locator('.output.stage').first().boundingBox();
    expect(box).not.toBeNull();
    expect(stage).not.toBeNull();
    if (box === null || stage === null) return;

    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);

    // Centered, like any sole phrase. A placeholder sized only in CSS was placed from
    // metrics the layout still thought were 0x0, so it hung off the centre into the
    // bottom-right quadrant instead of straddling it.
    const off = Math.max(
        Math.abs(box.x + box.width / 2 - (stage.x + stage.width / 2)),
        Math.abs(box.y + box.height / 2 - (stage.y + stage.height / 2)),
    );
    expect(off).toBeLessThan(Math.min(box.width, box.height) / 2);

    // And framed, not spilling out of the stage it was fit to.
    expect(box.width).toBeLessThanOrEqual(stage.width);
    expect(box.height).toBeLessThanOrEqual(stage.height);
});
