import { test, expect, type Page } from '@playwright/test';
import goHome from './goHome';

test('has Wordplay window title', async ({ page }) => {
    await goHome(page);

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle('Wordplay');
});
