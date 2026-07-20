import type { Page } from '@playwright/test';
import { idFromURL } from './idFromURL';

export async function createTestCharacter(page: Page): Promise<string> {
    // Create a new character 
    await page.goto('/en-US/characters');
    await page.getByTestId('newcharacter').click();

    // Wait for the URL to redirect to the new character page
    await page.waitForURL(/\/character\/[^/]+$/);

    // Extract the character ID from the URL (pathname only, to drop any query params)
    return idFromURL(page.url());
}