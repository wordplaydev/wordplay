import { expect, test } from '../../playwright/fixtures';
import { grantClipboard } from '../helpers/clipboard';
import { createTestProject } from '../helpers/createProject';

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

    /** The player's rendered width once the camera has stopped easing. Every
     *  camera change glides rather than snapping, and a glide can plateau for a
     *  sample or two, so this waits for several identical reads in a row. */
    async function restingWidth(): Promise<number> {
        let last = -1;
        let steady = 0;
        for (let i = 0; i < 40; i++) {
            await page.waitForTimeout(150);
            const width = Math.round((await player.boundingBox())?.width ?? 0);
            steady = width > 0 && width === last ? steady + 1 : 0;
            if (steady >= 4) return width;
            last = width;
        }
        throw new Error('the camera never settled');
    }

    // The program's camera, with the game untouched from here on.
    const byProgram = await restingWidth();
    expect(byProgram).toBeGreaterThan(0);

    // The audience zooms, which must change the view. This zooms out rather than
    // in, and via the toolbar rather than the wheel: a wheel delta is an
    // unpredictable amount of zoom, and zooming far enough IN walks the camera
    // past the player, who then vanishes and can't be measured.
    await page
        .locator('[data-uiid="stageZoom"]')
        .getByRole('button')
        .first()
        .click();
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
