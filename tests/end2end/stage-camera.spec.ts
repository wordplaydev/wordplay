import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../playwright/fixtures';
import { expectNoAxeViolations } from '../helpers/checkAccessibility';
import { grantClipboard } from '../helpers/clipboard';
import { createTestProject } from '../helpers/createProject';

/** An output's rendered width once the camera has stopped easing. Every camera change
 *  glides rather than snapping, and a glide can plateau for a sample or two, so this
 *  waits for several identical reads in a row. */
async function restingWidthOf(page: Page, output: Locator): Promise<number> {
    let last = -1;
    let steady = 0;
    for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(150);
        const width = Math.round((await output.boundingBox())?.width ?? 0);
        steady = width > 0 && width === last ? steady + 1 : 0;
        if (steady >= 4) return width;
        last = width;
    }
    throw new Error('the camera never settled');
}

/** Start Building Blocks playing, with the player on stage to measure the camera by. */
async function playBuildingBlocks(page: Page): Promise<Locator> {
    await page.goto('/en-US/project/example-BuildingBlocks?mode=play');
    const player = page.locator('[data-id="output-player"]');
    const stage = page.locator('.value[tabindex="0"]');
    await expect(stage).toBeVisible();
    await stage.focus();
    await page.keyboard.press('Enter');
    await expect(player).toBeVisible();
    return player;
}

const zoomOut = (page: Page) => page.locator('[data-uiid="stageZoomOut"]');
const zoomIn = (page: Page) => page.locator('[data-uiid="stageZoomIn"]');

/**
 * The camera composes rather than switching modes: a base focus from the program's
 * @Place (or from fitting, when it sets none) with the audience's pan and zoom
 * applied on top as an offset. So a zoom never takes the camera away from the
 * program — the program keeps driving underneath it — and clearing the offset must
 * return the view *exactly* to what the program asked for.
 *
 * Building Blocks sets a stage @Place, so the size it renders the player at is a
 * signature of the camera. Holding the game still and only changing the camera
 * isolates that: the player's rendered size can only change because the camera
 * did. Returning to exactly the program's size is what proves the offset was
 * cleared rather than merely changed, or the platform having taken over.
 */
test('clearing the audience zoom returns the program its camera', async ({
    page,
}) => {
    await page.goto('/en-US/project/example-BuildingBlocks?mode=play');

    const player = page.locator('[data-id="output-player"]');
    const stage = page.locator('.value[tabindex="0"]');
    await expect(stage).toBeVisible();

    // Start the round so the player and the tracking camera exist.
    await stage.focus();
    await page.keyboard.press('Enter');
    await expect(player).toBeVisible();

    const restingWidth = () => restingWidthOf(page, player);

    // The program's camera, with the game untouched from here on.
    const byProgram = await restingWidth();
    expect(byProgram).toBeGreaterThan(0);

    // The audience zooms, which must change the view. This zooms out rather than
    // in, and via the toolbar rather than the wheel: a wheel delta is an
    // unpredictable amount of zoom, and zooming far enough IN walks the camera
    // past the player, who then vanishes and can't be measured.
    await zoomOut(page).click();
    const byAudience = await restingWidth();
    expect(byAudience).not.toBe(byProgram);

    // The reset only appears once there is an adjustment to clear, which is
    // itself the signal that the zoom took effect.
    const reset = page.locator('[data-uiid="stageZoomReset"]');
    await expect(reset).toBeVisible();

    // Clearing the offset leaves the program's camera alone underneath, so the
    // view returns to exactly the size the program asked for. Both sizes are
    // computed rather than measured, so comparing them exactly is stable.
    await reset.click();
    expect(await restingWidth()).toBe(byProgram);
    // And with nothing left to clear, the control goes away again.
    await expect(reset).toBeHidden();
});

/**
 * Fitting frames the content when the program sets no @Place of its own. A
 * program that does set one is already framing the stage, so there is nothing
 * for fitting to do and the lock says so rather than sitting there inert.
 */
test('the fit lock is inactive for a program that sets its own camera', async ({
    page,
}) => {
    await page.goto('/en-US/project/example-BuildingBlocks?mode=play');
    await expect(page.locator('.value[tabindex="0"]')).toBeVisible();
    await expect(
        page.locator('[data-uiid="stageLock"]').first(),
    ).toHaveAttribute('aria-disabled', 'true');
});

/**
 * A stream can deliver its first content long after the stage first renders — a
 * @Camera's opening value is an empty frame, so the camera examples showed nothing
 * for a second or two and then arrived all at once. Fitting only what was on stage
 * when the viewport was first measured therefore fit an empty stage, and the picture
 * that turned up afterwards was never framed: it rendered at natural size, off
 * centre, and stayed that way until the window was resized or evaluation restarted.
 *
 * A keystroke stands in for the camera here, since CI has no camera to grant. It
 * reproduces the only part that matters: nothing to frame at first render, and
 * content with real extent a moment later. A @Time gate would read more like a
 * camera but can't work — the config sets `reducedMotion: 'reduce'` for every
 * context, which drives the animation factor to zero, and `Time.tick` doesn't
 * advance at a zero multiplier at all.
 *
 * The assertion is relative, not in pixels. Two marks a metre apart render a metre
 * apart — 64px — when nothing frames them, and fill most of the stage once they're
 * framed, so their separation as a fraction of the stage says which happened
 * without depending on the window size the runner happens to use.
 */
test('content that arrives after the first frame is still framed', async ({
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
    const code = `k: Key()
Stage((k = 'a') ? [
Phrase("o" name: "left" place: Place(-0.5m 0m) size: 0.25m duration: 0s)
Phrase("o" name: "right" place: Place(0.5m 0m) size: 0.25m duration: 0s)
] [])`;
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

    // ProjectModes is ['edit', 'debug', 'play'], so play is the third radio.
    await page
        .locator('[data-uiid="modeSwitcher"] button[role="radio"]')
        .nth(2)
        .click();

    // The stage renders empty first — the camera case — and only then is there
    // anything to frame.
    await expect(page.locator('.value[tabindex="0"]')).toBeVisible();

    const left = page.locator('[data-id="output-left"]');
    const right = page.locator('[data-id="output-right"]');

    // Press until the program answers: the stage drops keys until the evaluator
    // has resumed after the mode switch, and there's no DOM signal to wait on.
    await expect
        .poll(
            async () => {
                await page.keyboard.press('a');
                return await left.count();
            },
            { message: 'the key never reached the running program' },
        )
        .toBeGreaterThan(0);
    await expect(right).toBeVisible();

    /** How far apart the marks are, as a fraction of the stage's width, once the
     *  camera has stopped moving. Every camera change glides rather than snapping,
     *  and a glide can plateau for a sample or two, so this waits for several
     *  identical reads in a row. */
    async function restingSeparation(): Promise<number> {
        let last = -1;
        let steady = 0;
        for (let i = 0; i < 40; i++) {
            await page.waitForTimeout(150);
            const stage = await page.locator('.output.stage').boundingBox();
            const a = await left.boundingBox();
            const b = await right.boundingBox();
            const separation =
                stage && a && b && stage.width > 0
                    ? Math.round((Math.abs(b.x - a.x) / stage.width) * 1000) /
                      1000
                    : 0;
            steady = separation > 0 && separation === last ? steady + 1 : 0;
            if (steady >= 4) return separation;
            last = separation;
        }
        throw new Error('the camera never settled');
    }

    // Unframed, a metre is 64px, which is under a tenth of any stage the runner
    // uses; framed, the pair fills most of it.
    expect(await restingSeparation()).toBeGreaterThan(0.4);
});

/**
 * #1175: the audience could not click their way back to where they started. Zoom was a
 * fixed step in metres while scale is FOCAL_LENGTH / -z, so a click out and a click in
 * were different sizes everywhere except one depth, and a few clicks out took many more
 * to undo. A ratio makes each click the same size in what the viewer actually sees, so
 * the pair cancels — and the way home is a countable number of clicks, not a rescue by
 * the reset button.
 *
 * Measured on Building Blocks' player, as above: the game is untouched, so its rendered
 * size can only change because the camera did.
 */
test('zooming out and back in returns the program its camera', async ({
    page,
}) => {
    const player = await playBuildingBlocks(page);
    const byProgram = await restingWidthOf(page, player);
    expect(byProgram).toBeGreaterThan(0);

    for (let i = 0; i < 3; i++) await zoomOut(page).click();
    expect(await restingWidthOf(page, player)).not.toBe(byProgram);

    for (let i = 0; i < 3; i++) await zoomIn(page).click();
    expect(await restingWidthOf(page, player)).toBe(byProgram);

    // Landing exactly home is what clears the adjustment, so the control goes away
    // without ever having been pressed.
    await expect(page.locator('[data-uiid="stageZoomReset"]')).toBeHidden();
});

/**
 * The zoom level rides in the reset control rather than in a readout of its own, so how
 * far you are from the project's own view and the way back are one thing. It is a
 * percentage of the project's own camera, which makes home exactly 100% — a percentage of
 * natural size would put home at some arbitrary number and answer nothing.
 */
/** How far up its track the zoom gauge is filled, 0.5 being the project's own view. */
async function gaugeLevel(page: Page): Promise<number> {
    return page
        .locator('[data-uiid="stageZoomReset"] .zoom-gauge')
        .evaluate((el) =>
            Number.parseFloat(getComputedStyle(el).getPropertyValue('--level')),
        );
}

/**
 * The zoom level is shown as a bar rather than a percentage, so it is the same width at
 * every value. The exact number still reaches screen readers through the button's label,
 * which is why the bar itself is aria-hidden.
 */
test('the stage shows how far the audience has zoomed', async ({ page }) => {
    await playBuildingBlocks(page);
    const reset = page.locator('[data-uiid="stageZoomReset"]');

    // Always present, so the toolbar never changes width — but inactive with nothing to
    // clear, and sitting exactly on its centre line.
    await expect(reset).toBeVisible();
    await expect(reset).toHaveAttribute('aria-disabled', 'true');
    expect(await gaugeLevel(page)).toBeCloseTo(0.5, 5);

    await zoomOut(page).click();
    const out = await gaugeLevel(page);
    expect(out).toBeLessThan(0.5);
    await expect(reset).not.toHaveAttribute('aria-disabled', 'true');
    // The number is still spoken, even though it is no longer written.
    await expect(reset).toHaveAttribute('aria-label', /80/);

    await zoomIn(page).click();
    expect(await gaugeLevel(page)).toBeCloseTo(0.5, 5);

    await zoomIn(page).click();
    expect(await gaugeLevel(page)).toBeGreaterThan(0.5);

    await page.locator('[data-uiid="stageZoomReset"]').click();
    expect(await gaugeLevel(page)).toBeCloseTo(0.5, 5);
});

/**
 * Zooming used to reshuffle the whole toolbar. The reset control appeared and vanished with
 * the adjustment and carried a percentage whose width changed with its value, and
 * OverflowToolbar keeps a *prefix* of its items — so the zoom group growing took the budget
 * from everything behind it and sent those controls hopping into the overflow menu.
 */
test('zooming does not move the rest of the toolbar', async ({ page }) => {
    await playBuildingBlocks(page);

    /** Which controls are showing in the bar itself, rather than in the overflow menu. */
    const showing = () =>
        page
            .locator('.overflow-toolbar [data-uiid]')
            .evaluateAll((els) =>
                els.map((el) => el.getAttribute('data-uiid')).sort(),
            );

    const before = await showing();
    expect(before.length).toBeGreaterThan(0);

    for (let i = 0; i < 6; i++) await zoomOut(page).click();
    expect(await showing()).toEqual(before);

    for (let i = 0; i < 10; i++) await zoomIn(page).click();
    expect(await showing()).toEqual(before);
});

/**
 * Amy's ask on #1175: when the camera has put everything out of view, say so rather than
 * leaving a blank stage with no explanation.
 *
 * Panning is the way to get there. The zoom bound is calibrated so that content the stage
 * framed stays visible even at the very end of the zoom-out — see fit.test.ts — so zooming
 * alone can no longer empty a stage, while panning is deliberately unbounded. A paused
 * stage pans a metre per arrow key, which is the one pan path that does not depend on
 * synthesizing a drag.
 *
 * The hint is unreachable from the standing axe scans, which never move the camera, so it
 * is scanned here while it is up. The wider viewport is for that scan and not for the
 * hint: at the default width the stage toolbar collapses into its overflow control, whose
 * own target size is a pre-existing failing of that widget rather than of anything here.
 */
test.describe('an emptied stage', () => {
    test.use({ viewport: { width: 1600, height: 900 } });

    test('the stage says when the audience has left nothing on it', async ({
        page,
    }) => {
        test.setTimeout(60000);

        await page.goto('/en-US/project/example-BuildingBlocks?mode=edit');
        const stage = page.locator('.value[tabindex="0"]');
        await expect(stage).toBeVisible();
        await stage.focus();

        const hint = page.locator('[data-uiid="stageContentHidden"]');
        await expect(hint).toBeHidden();

        // Far enough that the content has left the stage entirely, whatever the runner's
        // window size — a metre is 64px unframed, and the stage is never 40 metres wide.
        for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowLeft');

        await expect(hint).toBeVisible();
        await expectNoAxeViolations(page);

        // And the way out actually works: pressing it hands the camera back.
        await page.locator('[data-uiid="stageShowEverything"]').click();
        await expect(hint).toBeHidden();
        await expect(page.locator('[data-uiid="stageZoomReset"]')).toBeHidden();
    });
});
