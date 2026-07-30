import { expect, test } from '@playwright/test';
import { createTestProject } from '../helpers/createProject';

test('does anything speak', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 200)));
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('1 + 2');
    await page.waitForTimeout(1200);
    const read = async () => ({
        paced: ((await page.locator('.announcements.paced').textContent()) ?? '').trim(),
        imm: ((await page.locator('.announcements.immediate').textContent()) ?? '').trim(),
    });
    console.log('AFTER TYPING', JSON.stringify(await read()));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    console.log('AFTER ESCAPE', JSON.stringify(await read()));
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(800);
    console.log('AFTER ARROW ', JSON.stringify(await read()));
    console.log('ERRORS', JSON.stringify(errors.slice(0, 5)));
    expect(true).toBe(true);
});
