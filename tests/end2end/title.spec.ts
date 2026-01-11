import { expect, test } from '@playwright/test';
import goHome from '../helpers/goHome';

test('has Wordplay window title', async ({ page }) => {
    await goHome(page);

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle('Wordplay');
});
