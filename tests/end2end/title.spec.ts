import { expect, test } from '../../playwright/fixtures';
import goHome from './goHome';

test('has Wordplay window title', async ({ page }) => {
    await goHome(page);

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle('Wordplay');
});
