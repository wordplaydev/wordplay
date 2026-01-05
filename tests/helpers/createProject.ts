import type { Page } from '@playwright/test';

export async function createTestProject(page: Page): Promise<string> {
    // Create a new project
    await page.goto('/projects');
    await page.getByTestId('addproject').click();

    // Wait for the page to redirect to the new project
    await page.waitForURL(/\/project\/[^/]+$/);

    // Extract the project ID from the URL
    const url = page.url();
    const projectId = url.split('/').pop() as string;
    return projectId;
}