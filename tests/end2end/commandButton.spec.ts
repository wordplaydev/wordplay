import { expect, test } from '@playwright/test';

test('create project and check for command buttons and their functionalities ', async ({
    page,
}) => {
    await page.goto('/en-US/projects');

    // Create a new blank project
    await page.getByTestId('addproject').click();

    // Wait for the URL redirect to the project.
    await page.waitForURL(/\/project\/.+/);

    // The mode switcher is in the output toolbar in every mode.
    const ModeSwitcher = page.locator('[data-uiid="modeSwitcher"]');
    await expect(ModeSwitcher).toBeVisible();

    // Projects open in edit mode, where a fresh program has no input history
    // to navigate — so no timeline — and the step buttons, debugger
    // apparatus, are never shown while editing.
    const TimeLineSlider = page.locator('[data-uiid="timeline"]');
    await expect(TimeLineSlider).not.toBeVisible();
    const StepBackButton = page.locator('[data-uiid="stepBack"]');
    await expect(StepBackButton).not.toBeVisible();

    // Enter debug mode via the middle button (edit, debug, play): the
    // timeline appears with the step buttons above it.
    await ModeSwitcher.getByRole('radio').nth(1).click();
    await expect(TimeLineSlider).toBeVisible();
    await expect(StepBackButton).toBeVisible();

    // Enter play mode via the last button: the pause-time controls hide
    // while the program runs live.
    await ModeSwitcher.getByRole('radio').nth(2).click();
    await expect(TimeLineSlider).not.toBeVisible();

    // And back to debug for the step-button assertions below.
    await ModeSwitcher.getByRole('radio').nth(1).click();
    await expect(TimeLineSlider).toBeVisible();

    const StepForwardButton = page.locator('[data-uiid="stepForward"]');
    await expect(StepForwardButton).toBeVisible();

    const StepOut = page.locator('[data-uiid="stepOut"]');
    await expect(StepOut).toBeVisible();

    const BackOneInput = page.locator('[data-uiid="stepBackInput"]');
    await expect(BackOneInput).toBeVisible();

    const StepBackOne = page.locator('[data-uiid="stepBackNode"]');
    await expect(StepBackOne).toBeVisible();

    const ToEnd = page.locator('[data-uiid="stepOut"]');
    await expect(ToEnd).toBeVisible();
});

test('the step timeline is a full-width scrubber you can grab', async ({
    page,
}) => {
    await page.goto('/en-US/projects');
    await page.getByTestId('addproject').click();
    await page.waitForURL(/\/project\/.+/);

    const ModeSwitcher = page.locator('[data-uiid="modeSwitcher"]');
    await expect(ModeSwitcher).toBeVisible();

    // A fresh program has no history for edit mode's timeline, so the
    // scrubber lives in debug mode here.
    await ModeSwitcher.getByRole('radio').nth(1).click();
    const Timeline = page.locator('[data-uiid="timeline"]');
    await expect(Timeline).toBeVisible();

    // It gets a line of its own, so it spans the controls rather than taking
    // whatever the step buttons leave. Sharing a line with them, it measured
    // 73px of a 403px toolbar — too narrow to aim at, and it could only get
    // wider by pushing the step buttons into the overflow menu.
    const width = await Timeline.evaluate((el) => {
        const row = el.closest('.subtoolbar');
        return row
            ? el.getBoundingClientRect().width /
                  row.getBoundingClientRect().width
            : 0;
    });
    expect(width).toBeGreaterThan(0.9);

    // And the time cursor is a handle: a drag that starts on the cursor itself
    // scrubs, rather than only a drag that starts on the track. The cursor
    // starts at the present — the right edge of the event marks — so drag it
    // leftward to the start of the track, crossing the marks. (A fresh
    // program's history is only a few ems wide; the strip's remaining width
    // is room for input events to accumulate.)
    const cursor = Timeline.locator('.time');
    await expect(cursor).toBeVisible();
    const before = await Timeline.getAttribute('aria-valuenow');
    const track = await Timeline.boundingBox();
    const grip = await cursor.boundingBox();
    if (track === null || grip === null) throw new Error('no timeline to drag');
    await page.mouse.move(grip.x + 1, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(track.x + 4, grip.y + grip.height / 2, {
        steps: 12,
    });
    await page.mouse.up();
    expect(await Timeline.getAttribute('aria-valuenow')).not.toBe(before);
});
