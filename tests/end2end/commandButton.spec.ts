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

    // Projects open in edit mode, so the debug footer is hidden until step mode.
    const TimeLineSlider = page.locator('[data-uiid="timeline"]');
    await expect(TimeLineSlider).not.toBeVisible();

    // Enter step mode via the switcher's second button.
    await ModeSwitcher.getByRole('radio').nth(1).click();

    await expect(TimeLineSlider).toBeVisible();

    const StepBackButton = page.locator('[data-uiid="stepBack"]');
    await expect(StepBackButton).toBeVisible();

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
