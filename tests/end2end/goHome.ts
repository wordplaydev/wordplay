import { type Page } from '../../playwright/fixtures';

export default async function goHome(page: Page) {
    await page.goto('/', { timeout: 10000 });
}
