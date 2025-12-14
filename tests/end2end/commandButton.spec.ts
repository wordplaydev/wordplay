import { expect, test } from '../../playwright/fixtures';

test('create project and check for command buttons and their functionalities ', async ({
    page,
}) => {
    await page.goto('/projects');

    // Create a new blank project
    await page.getByTestId('addproject').click();

    // Wait for the URL redirect to the project.
    await page.waitForURL(/\/project\/.+/);

    const StepBackButton = page.locator('[data-uiid="4"]');
    await expect(StepBackButton).toBeVisible();

    const StepForwardButton = page.locator('[data-uiid="5"]');
    await expect(StepForwardButton).toBeVisible();

    const StepOut = page.locator('[data-uiid="12"]');
    await expect(StepOut).toBeVisible();

    const BackOneInput = page.locator('[data-uiid="6"]');
    await expect(BackOneInput).toBeVisible();

    const StepBackOne = page.locator('[data-uiid="8"]');
    await expect(StepBackOne).toBeVisible();

    const ToEnd = page.locator('[data-uiid="12"]');
    await expect(ToEnd).toBeVisible();

    const TimeLineSlider = page.locator('[data-uiid="timeline"]');
    await expect(TimeLineSlider).toBeVisible();

    const PlayButton = page.locator('[data-uiid="playToggle"]');
    await expect(PlayButton).toBeVisible();
});
