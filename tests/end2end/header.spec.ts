import { test, expect, type Page } from '@playwright/test';
import goHome from './goHome';

test('has Wordplay header', async ({ page }) => {
    await goHome(page);

    // Expects page to have a heading with the name Wordplay.
    await expect(page.getByRole('heading', { name: 'Wordplay' })).toBeVisible();
});
