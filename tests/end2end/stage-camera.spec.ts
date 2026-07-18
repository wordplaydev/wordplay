import { expect, test } from '@playwright/test';

/**
 * The stage has two camera modes: the audience drives it (after a pan or zoom),
 * or the platform does — and when the platform does, a @Place set by the program
 * wins over fitting content to the viewport. Handing the camera back by
 * re-enabling fit must restore the program's camera, not strand the stage on the
 * audience's last zoom.
 *
 * Building Blocks sets a stage @Place, so the size it renders the player at is a
 * signature of which camera is driving. Holding the game still and only changing
 * camera modes isolates that: the player's rendered size can only change because
 * the camera did. Fitting the content settles on its own distinct size, so
 * returning to *exactly* the program's size is what proves the program got the
 * camera back rather than the platform merely taking over.
 */
test('re-enabling fit hands the camera back to the program', async ({
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

    // Zooming takes the camera away from the program, which must change the view.
    // This zooms out rather than in, and via the toolbar rather than the wheel:
    // a wheel delta is an unpredictable amount of zoom, and zooming far enough IN
    // walks the camera past the player, who then vanishes and can't be measured.
    await page
        .locator('[data-uiid="stageZoom"]')
        .getByRole('button')
        .first()
        .click();
    const byAudience = await restingWidth();
    expect(byAudience).not.toBe(byProgram);

    // Re-enabling fit gives it back, so the program's camera drives once more.
    // Fitting settles on a size several times the program's here, so this catches
    // the platform taking over as readily as it catches the audience's zoom
    // sticking. Both sizes are computed rather than measured, so comparing them
    // exactly is stable.
    await page.locator('[data-uiid="stageLock"]').first().click();
    expect(await restingWidth()).toBe(byProgram);
});
