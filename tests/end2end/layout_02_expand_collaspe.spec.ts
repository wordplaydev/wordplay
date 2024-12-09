import { test, expect } from '@playwright/test';

// Verify the "expand into full scrren" and "exit fullscreen" of each tile
test('tile expand to full screen and exit functionality', async ({ page }) => {
    await page.goto('/projects');
    // Create and navigate to a project first
    await page.getByTestId('addproject').click();
    await page.getByTestId('preview').nth(0).click();
    await page.waitForURL(/\/project\/.+/);
    // Make sure all initial tiles are open
    await page.getByTestId('docs-toggle').click();
    await page.getByTestId('palette-toggle').click();

        const sections = [
            { name: 'guide', text: 'guide'},
            { name: 'source', text: '📄 start '},
            { name: 'stage', text: '🎭stage'},
            { name: 'palette', text: 'palette' }
        ];
    
        for (const section of sections) {
            console.log(`Testing section: ${section.name}`);
    
            // Ensure the section is visible
            const sectionElement = await page.locator('section').filter({ hasText: section.text });
            await expect(sectionElement).toBeVisible();
    
            // Locate and click the expand button
            const expandButton = await sectionElement.getByLabel('expand to full screen');
            await expect(expandButton).toBeVisible();
            await expandButton.click();
    
            // Verify only the current section is visible in fullscreen
            await expect(sectionElement).toBeVisible();
            for (const otherSection of sections) {
                if (otherSection.name !== section.name) {
                    const otherElement = page.locator('section').filter({ hasText: otherSection.text });
                    await expect(otherElement).not.toBeVisible();
                }
            }
    
            // Locate and click the same button again(but this time is exit)
            const collapseButton = await sectionElement.getByLabel('exit full screen');
            await expect(collapseButton).toBeVisible();
            await collapseButton.click();
    
            // Verify fullscreen exit
            await Promise.all([
                expect(page.getByTestId('output')).toBeVisible(),
                expect(page.getByTestId('editor')).toBeVisible(),
                expect(page.getByTestId('documentation')).toBeVisible(),
                expect(page.getByTestId('palette')).toBeVisible(),
            ]);
        }
});