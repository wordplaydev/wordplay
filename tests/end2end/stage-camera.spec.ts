import { expect, test } from '@playwright/test';

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
    await expect(page.locator('[data-uiid="stageLock"]').first()).toHaveAttribute(
        'aria-disabled',
        'true',
    );
});
