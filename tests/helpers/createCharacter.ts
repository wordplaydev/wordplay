import type { Page } from '@playwright/test';

export async function createTestCharacter(page: Page): Promise<string> {
    // Create a new character 
    await page.goto('/characters');
    await page.getByTestId('newcharacter').click();

    // Wait for the URL to redirect to the new character page
    await page.waitForURL(/\/character\/[^/]+$/);

    // Extract the character ID from the URL
    const url = page.url();
    const characterId = url.split('/').pop() as string;
    return characterId;
}