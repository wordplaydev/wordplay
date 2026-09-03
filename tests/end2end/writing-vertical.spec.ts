import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from '../helpers/checkAccessibility';
import { grantClipboard } from '../helpers/clipboard';
import { createTestProject } from '../helpers/createProject';

/**
 * Writing vertically puts the inline axis on the screen's vertical axis, which
 * inverts what the arrow keys mean and which way the caret bar runs. None of
 * that is reachable from the unit suite — `getBoundingClientRect` is zero in
 * JSDOM — so these are the tests that can tell a working vertical editor from
 * one that merely compiles.
 */

/** The focused editor's hidden mirror field, which follows the caret. */
function mirror(page: import('@playwright/test').Page) {
    return page
        .locator('.keyboard-input')
        .first()
        .evaluate((el) => {
            const field = el as HTMLTextAreaElement;
            return { value: field.value, start: field.selectionStart };
        });
}

/** The caret bar's rendered box. */
function bar(page: import('@playwright/test').Page) {
    return page.locator('.caret .bar').first().boundingBox();
}

/** Choose a writing layout before the app boots, the way a returning creator
 *  arrives with one already stored. The locale is not set here — it lives in the
 *  URL, so it is passed to createTestProject instead. */
async function withLayout(
    page: import('@playwright/test').Page,
    layout: string,
) {
    await page.addInitScript((chosen) => {
        window.localStorage.setItem('writingLayout', JSON.stringify(chosen));
    }, layout);
}

/** A vertical-capable locale, so the interface's writing layout is offered. */
const Vertical = 'ja-JP';

/** Choose the editor's writing layout from its own toolbar. The control only
 *  exists when the source's glyphs allow something other than horizontal, so
 *  this doubles as an assertion that they do. */
async function chooseEditorLayout(
    page: import('@playwright/test').Page,
    label: 'horizontal' | 'vertical',
) {
    // In a tile this narrow the toolbar has already collapsed its display
    // toggles into the overflow menu — the soft-wrap one included — so the
    // control has to be revealed the same way a creator would reveal it.
    const control = page.locator('[data-uiid="writingToggle"]');
    await control.first().waitFor({ state: 'attached' });
    if (!(await control.first().isVisible()))
        await page.locator('[data-uiid="editorExpand"]').first().click();
    const visible = control.locator('visible=true').first();
    await visible.waitFor();
    await visible
        .getByRole('radio')
        .nth(label === 'horizontal' ? 0 : 1)
        .click();
    // Leave the popup and put focus back where a creator would carry on typing;
    // otherwise the next keystroke goes to the overflow menu, not the code.
    await page.keyboard.press('Escape');
    const editor = page.getByTestId('editor').first();
    await editor.click();
    // Wait for the layout to actually apply rather than assuming: the first
    // keystroke after the click otherwise lands mid-relayout and moves by the
    // old axis.
    await expect
        .poll(async () =>
            editor.evaluate((el) => getComputedStyle(el).writingMode),
        )
        .toBe(label === 'horizontal' ? 'horizontal-tb' : 'vertical-rl');
}

/** A project holding `code`, with the editor focused. */
async function withCode(page: import('@playwright/test').Page, code: string) {
    await grantClipboard(page);
    await createTestProject(page, Vertical);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    // Paste rather than type: the editor's delimiter auto-close mangles typed
    // brackets and quotes.
    await page.evaluate(
        (source) => navigator.clipboard.writeText(source),
        code,
    );
    await page.keyboard.press('ControlOrMeta+v');
    await expect
        .poll(async () => (await mirror(page)).value, {
            message: 'source did not load into the editor',
        })
        .toBe(code);
}

/** Japanese throughout, so the source is eligible for vertical. A Latin program
 *  is not, which is the whole point of the change these tests cover. */
const Program = "挨拶: 'こんにちは'\n俳句: 'ふるいけや'\nかえる: 'とびこむ'";

/** The same shape in Latin, which must never be offered vertical. */
const LatinProgram = "greeting: 'hello'\nPhrase(greeting)";

test.describe('vertical writing', () => {
    test('the root reports the chosen layout', async ({ page }) => {
        await withLayout(page, 'vertical-rl');
        await createTestProject(page, Vertical);
        await expect
            .poll(async () =>
                page.evaluate(() =>
                    document.documentElement.getAttribute(
                        'data-writing-layout',
                    ),
                ),
            )
            .toBe('vertical-rl');
    });

    test('the editor lays code out down the screen', async ({ page }) => {
        await withCode(page, Program);
        await chooseEditorLayout(page, 'vertical');
        const mode = await page
            .getByTestId('editor')
            .first()
            .evaluate((el) => getComputedStyle(el).writingMode);
        expect(mode).toBe('vertical-rl');
    });

    test('the code itself runs down the screen, not just its container', async ({
        page,
    }) => {
        // The editor renders its code through RootView, which declares
        // `horizontal-tb` so a snippet inside a concept's documentation is never
        // laid out sideways by the reader's prose setting. Inside the editor
        // that rule would defeat the whole feature — and the assertions above
        // could not see it, because they measure the editor element, whose own
        // writing mode stays vertical while the code inside it is not.
        await withCode(page, Program);
        await chooseEditorLayout(page, 'vertical');
        const laidOut = await page
            .getByTestId('editor')
            .first()
            .evaluate((el) => {
                const root = el.querySelector('.root');
                if (root === null) return null;
                const tokens = [...root.querySelectorAll('.token-view')]
                    .slice(0, 2)
                    .map((token) => {
                        const box = token.getBoundingClientRect();
                        return { x: Math.round(box.x), y: Math.round(box.y) };
                    });
                return { mode: getComputedStyle(root).writingMode, tokens };
            });
        expect(laidOut?.mode).toBe('vertical-rl');
        // Consecutive tokens on one line stack down the screen rather than
        // running across it, which is what "vertical" actually means here.
        const [first, second] = laidOut?.tokens ?? [];
        expect(second.y).toBeGreaterThan(first.y);
        expect(Math.abs(second.x - first.x)).toBeLessThan(4);
    });

    test('the caret bar runs across the text, not down it', async ({
        page,
    }) => {
        await withCode(page, Program);
        await chooseEditorLayout(page, 'vertical');
        const box = await bar(page);
        expect(box).not.toBeNull();
        // Writing vertically the caret is a horizontal bar: wider than it is
        // tall. Horizontally it is the other way round, which is what the
        // rendered `extent` swapping onto the other CSS axis achieves.
        expect(box!.width).toBeGreaterThan(box!.height);
    });

    test('up and down move along the text, left and right between lines', async ({
        page,
    }) => {
        await withCode(page, Program);
        await chooseEditorLayout(page, 'vertical');

        // Measured as geometry rather than through the mirror's offset, which
        // is not a character position to do arithmetic on: an inline move can
        // land on a node selection, and the mirror reports a selection's start,
        // so the number jumps in ways that have nothing to do with the writing
        // mode (see InlineMovement.test.ts). Where the caret is *drawn* is both
        // what this test actually claims and what a creator sees.
        const at = async () => {
            const box = await bar(page);
            expect(box).not.toBeNull();
            return box!;
        };

        // Anchor away from the edges, wherever the click left the caret: Right
        // is the previous line, so three presses reach the start of the first
        // one, and two Downs then move along it far enough to move back.
        for (let press = 0; press < 3; press++)
            await page.keyboard.press('ArrowRight');
        for (let press = 0; press < 2; press++)
            await page.keyboard.press('ArrowDown');
        const start = await at();

        /** Which way a move mostly went. Compared rather than measured against a
         *  tolerance because the bar shifts a few pixels across the text when a
         *  move lands on a node selection, which is not the axis under test. */
        const moved = (from: { x: number; y: number }, to: typeof from) =>
            Math.abs(to.x - from.x) > Math.abs(to.y - from.y)
                ? 'between lines'
                : 'along the text';

        // Up moves along the line: writing vertically, the text runs down the
        // screen, so the caret travels in y and stays in its column.
        await page.keyboard.press('ArrowUp');
        const afterUp = await at();
        expect(moved(start, afterUp)).toBe('along the text');

        // Left is the next line, and lines progress right to left, so this is
        // the move that changes columns.
        await page.keyboard.press('ArrowLeft');
        expect(moved(afterUp, await at())).toBe('between lines');
    });

    test('a reader only ever gets the direction their script is set in', async ({
        page,
    }) => {
        // vertical-lr is Mongolian's direction; Japanese is never set in it. A
        // stored choice of it — from another locale, or from before the control
        // narrowed to one option — resolves to the direction Japanese uses
        // rather than being honoured literally.
        await withLayout(page, 'vertical-lr');
        await createTestProject(page, Vertical);
        await expect
            .poll(async () =>
                page.evaluate(() =>
                    document.documentElement.getAttribute(
                        'data-writing-layout',
                    ),
                ),
            )
            .toBe('vertical-rl');
    });

    test('Latin code is never offered a vertical layout', async ({ page }) => {
        // The bug this whole mechanism exists to fix: a Latin project turning
        // sideways because of the language the *reader* chose. There is no
        // control to turn it sideways with.
        await withLayout(page, 'vertical-rl');
        await withCode(page, LatinProgram);
        await expect(page.locator('[data-uiid="writingToggle"]')).toHaveCount(
            0,
        );
        expect(
            await page
                .getByTestId('editor')
                .first()
                .evaluate((el) => getComputedStyle(el).writingMode),
        ).toBe('horizontal-tb');
    });

    test('the interface layout no longer decides the editor', async ({
        page,
    }) => {
        // Even for eligible code, the interface setting must not reach it: the
        // editor starts horizontal until the creator says otherwise.
        await withLayout(page, 'vertical-rl');
        await withCode(page, Program);
        expect(
            await page
                .getByTestId('editor')
                .first()
                .evaluate((el) => getComputedStyle(el).writingMode),
        ).toBe('horizontal-tb');
        // ...while the interface itself is still vertical.
        expect(
            await page.evaluate(() =>
                document.documentElement.getAttribute('data-writing-layout'),
            ),
        ).toBe('vertical-rl');
    });

    test('a chosen layout survives a reload', async ({ page }) => {
        await withCode(page, Program);
        await chooseEditorLayout(page, 'vertical');
        // Let the project's own save settle first: reloading before the pasted
        // code persists brings back the default Latin source, which is not
        // eligible for vertical at all, so the assertion would be about the
        // wrong thing.
        await page.waitForTimeout(2500);
        await page.reload();
        const editor = page.getByTestId('editor').first();
        await editor.waitFor();
        await expect
            .poll(async () =>
                editor.evaluate((el) => getComputedStyle(el).writingMode),
            )
            .toBe('vertical-rl');
    });

    /** Open settings and count the writing-layout control, located by its
     *  horizontal-layout icon so the check doesn't depend on the UI language. */
    async function writingControls(
        page: import('@playwright/test').Page,
        locale: string,
    ) {
        await createTestProject(page, locale);
        await page.getByTestId('settings').first().click();
        const dialog = page.getByRole('dialog').first();
        await expect(dialog).toBeVisible();
        // Located by uiid, not by label: the labels are translated, so a name
        // match would report "absent" in every language but English.
        return dialog.locator('[data-uiid="writingLayout"]').count();
    }

    test('a Latin-script creator is never offered the choice', async ({
        page,
    }) => {
        // The gate. Turning an English interface sideways helps nobody, which is
        // why the control isn't merely defaulted off but absent (#220).
        expect(await writingControls(page, 'en-US')).toBe(0);
    });

    test('a creator who reads a vertical-capable script is', async ({
        page,
    }) => {
        // The other half: without this the test above would pass even if the
        // control had been deleted outright.
        expect(await writingControls(page, Vertical)).toBe(1);
    });
});

/** Open a lesson. `/learn` shows a quick-or-complete chooser first, so the
 *  tutorial itself doesn't exist until one is picked. */
async function openLesson(
    page: import('@playwright/test').Page,
    locale: string,
) {
    await page.goto(`/${locale}/learn`);
    await page.locator('button.card').first().click();
    await page.locator('.tutorial .content').first().waitFor();
}

test.describe('pages that are not prose', () => {
    /* The reading surface is opt-in per page, not a property of the wrapper the
       static pages share: most of them are listings or forms, and a grid inside
       vertical text is laid out within a column. `/projects` measured zero
       pixels wide before this was made opt-in. */
    test('a listing page stays horizontal and keeps its grid', async ({
        page,
    }) => {
        await withLayout(page, 'vertical-rl');
        await page.goto(`/${Vertical}/galleries`);
        const surface = page.locator('.writing').first();
        await surface.waitFor({ timeout: 20000 });
        const listing = await surface.evaluate((el) => {
            const grid = el.querySelector('.previews');
            return {
                mode: getComputedStyle(el).writingMode,
                gridWidth:
                    grid === null
                        ? null
                        : Math.round(grid.getBoundingClientRect().width),
                surfaceWidth: Math.round(el.getBoundingClientRect().width),
            };
        });
        expect(listing.mode).toBe('horizontal-tb');
        // The grid fills the surface rather than collapsing into one column.
        expect(listing.gridWidth).toBe(listing.surfaceWidth);
    });

    test('a prose page does follow the reader', async ({ page }) => {
        // The other half: opting out everywhere would be just as wrong, and this
        // is what says the mechanism still reaches the pages meant to have it.
        await withLayout(page, 'vertical-rl');
        await page.goto(`/${Vertical}/about`);
        const surface = page.locator('.writing').first();
        await surface.waitFor({ timeout: 20000 });
        expect(
            await surface.evaluate((el) => getComputedStyle(el).writingMode),
        ).toBe('vertical-rl');
    });
});

test.describe('the tutorial', () => {
    test('keeps the dialog a tall column so the lines have their length', async ({
        page,
    }) => {
        // Vertical text takes its measure from the block's *height*, so the
        // full-height column the dialog already occupies is the right container
        // — stacking it into a wide strip, which is what this first did, gave a
        // 12-character line and squeezed the lesson to 143px.
        await withLayout(page, 'vertical-rl');
        await openLesson(page, Vertical);
        const layout = await page
            .locator('.tutorial .content')
            .first()
            .evaluate((el) => {
                const measure = (selector: string) => {
                    const found = el.querySelector(selector);
                    if (!(found instanceof HTMLElement)) return null;
                    return {
                        mode: getComputedStyle(found).writingMode,
                        height: Math.round(
                            found.getBoundingClientRect().height,
                        ),
                        overflows: found.scrollHeight > found.clientHeight + 1,
                    };
                };
                return {
                    flow: getComputedStyle(el).flexDirection,
                    height: Math.round(el.getBoundingClientRect().height),
                    dialog: measure('.dialog'),
                    lines: measure('.lines'),
                    controls: measure('.turns .controls'),
                };
            });
        expect(layout.flow).toBe('row');
        // The lines are the prose, and only the prose: the nav row above them
        // stays horizontal, since a flex row in vertical text runs *down* the
        // page and turned the ← title → row into a 1083px-wide stack.
        expect(layout.lines?.mode).toBe('vertical-rl');
        expect(layout.controls?.mode).toBe('horizontal-tb');
        // Full height, which is the line length; and the dialog contains it
        // rather than being overflowed by it, which is what made the lesson
        // unreadable — a 640px block inside a 378px dialog.
        expect(layout.dialog?.height).toBe(layout.height);
        expect(layout.dialog?.overflows).toBe(false);
    });

    test('keeps its side-by-side layout when writing horizontally', async ({
        page,
    }) => {
        // The other half: the vertical rules must not leak into the default.
        await openLesson(page, 'en-US');
        const content = page.locator('.tutorial .content').first();
        expect(
            await content.evaluate((el) => getComputedStyle(el).flexDirection),
        ).toBe('row');
        expect(
            await page
                .locator('.tutorial .lines')
                .first()
                .evaluate((el) => getComputedStyle(el).writingMode),
        ).toBe('horizontal-tb');
    });

    test('sets foreign code listings horizontally inside vertical prose', async ({
        page,
    }) => {
        // The quick tutorial compares Wordplay to a language you already know,
        // and a Python listing rotated onto its side is unreadable — its line
        // breaks mean something. Same rule RootView applies to Wordplay's own.
        await withLayout(page, 'vertical-rl');
        await openLesson(page, Vertical);
        // The first pause has no listing in it, so walk forward until one is on
        // screen rather than assuming where the tutorial opens.
        const listing = page
            .locator('.tutorial .lines .external-example')
            .first();
        const next = page.locator('.tutorial .turns .controls button').nth(1);
        for (let step = 0; step < 8 && !(await listing.count()); step++) {
            await next.click();
            await page.waitForTimeout(500);
        }
        await listing.waitFor();
        expect(
            await listing.evaluate((el) => getComputedStyle(el).writingMode),
        ).toBe('horizontal-tb');
    });

    test('passes axe when writing vertically', async ({ page }) => {
        await withLayout(page, 'vertical-rl');
        await openLesson(page, Vertical);
        await expectNoAxeViolations(page);
    });
});

test.describe('vertical accessibility', () => {
    // A writing mode changes how everything is laid out, so the axe scan has to
    // run against it too: contrast, focus order, and name computation are all
    // things a transposed layout can break without breaking a single unit test.
    for (const layout of ['vertical-rl', 'vertical-lr'] as const) {
        test(`the editor passes axe in ${layout}`, async ({ page }) => {
            await withLayout(page, layout);
            await withCode(page, Program);
            await expectNoAxeViolations(page);
        });
    }
});
