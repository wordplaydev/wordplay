import { expect, test } from '@playwright/test';

test('create project and check for command buttons and their functionalities ', async ({
    page,
}) => {
    await page.goto('/projects');

    // Create a new blank project
    await page.getByTestId('addproject').click();

    // Click the first preview link
    await page.getByTestId('preview').nth(0).click();

    // Wait for the URL redirect to the project.
    await page.waitForURL(/\/project\/.+/);

    const StepBackButton = await page.locator('[data-uiid="4"]');
    await expect(StepBackButton).toBeVisible();

    const StepForwardButton = await page.locator('[data-uiid="5"]');
    await expect(StepForwardButton).toBeVisible();

    const StepOut = await page.locator('[data-uiid="12"]');
    await expect(StepOut).toBeVisible();

    const BackOneInput = await page.locator('[data-uiid="6"]');
    await expect(BackOneInput).toBeVisible();

    const StepBackOne = await page.locator('[data-uiid="8"]');
    await expect(StepBackOne).toBeVisible();

    const ToEnd = await page.locator('[data-uiid="12"]');
    await expect(ToEnd).toBeVisible();

    const TimeLineSlider = await page.locator('[data-uiid="timeline"]');
    await expect(TimeLineSlider).toBeVisible();

    const PlayButton = await page.locator('[data-uiid="playToggle"]');
    await expect(PlayButton).toBeVisible();
});
