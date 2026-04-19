import type { Page } from '@playwright/test';

export async function createTestProject(page: Page): Promise<string> {
    // Create a new project
    await page.goto('/projects');
    await page.getByTestId('addproject').click();

    // Wait for the page to redirect to the new project
    await page.waitForURL(/\/project\/[^/]+$/);

    // Wait for the project to finish loading before returning — the name field is
    // disabled until the project is hydrated from the database, and interacting
    // before that causes a re-render to overwrite any edits made immediately after.
    await page.locator('#project-name:not([disabled])').waitFor();

    // Extract the project ID from the URL
    const url = page.url();
    const projectId = url.split('/').pop() as string;
    return projectId;
}