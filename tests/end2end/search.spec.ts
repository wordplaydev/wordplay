import { expect, test } from '@playwright/test';

test.describe('Project Search Feature', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to projects page
        await page.goto('/projects');
    });

    test('should display search bar', async ({ page }) => {
        // Check if search input is visible
        const searchInput = page.locator('input[placeholder="Search projects and sources"]');
        await expect(searchInput).toBeVisible();
    });

    test('should filter projects in real-time', async ({ page }) => {
        const searchInput = page.locator('input[placeholder="Search projects and sources"]');

        // Type a search term
        await searchInput.fill('test');

        // Wait for search to complete
        await page.waitForTimeout(500);

        // Check that filtered results are shown
        const projectCards = page.locator('.project');
        await expect(projectCards).toHaveCount(1);
    });

    test('should show no results message for non-matching search', async ({ page }) => {
        const searchInput = page.locator('input[placeholder="Search projects and sources"]');

        // Type a search term that shouldn't match anything
        await searchInput.fill('nonexistentproject123');

        // Wait for search to complete
        await page.waitForTimeout(500);

        // Check that no results message is shown
        const noResultsMessage = page.locator('.no-results-message');
        await expect(noResultsMessage).toBeVisible();
        await expect(noResultsMessage).toContainText('No projects found for');
    });

    test('should highlight matching text', async ({ page }) => {
        const searchInput = page.locator('input[placeholder="Search projects and sources"]');

        // Type a search term that should match project names
        await searchInput.fill('test');

        // Wait for search to complete
        await page.waitForTimeout(500);

        // Check that highlighted text is present
        const highlightedText = page.locator('.search-highlight');
        await expect(highlightedText).toBeVisible();
    });

    test('should handle fuzzy search with typos', async ({ page }) => {
        const searchInput = page.locator('input[placeholder="Search projects and sources"]');

        // Type a search term with a typo
        await searchInput.fill('projct');

        // Wait for search to complete
        await page.waitForTimeout(500);

        // Should still find projects with "project" in the name
        const projectCards = page.locator('.project');
        await expect(projectCards).toHaveCount(1);
    });

    test('should find archived projects in search results', async ({ page }) => {
        const searchInput = page.locator('input[placeholder="Search projects and sources"]');

        // Type a search term that should match archived projects
        await searchInput.fill('archived');

        // Wait for search to complete
        await page.waitForTimeout(500);

        // Should find archived projects
        const projectCards = page.locator('.project');
        await expect(projectCards).toHaveCount(1);

        // Check that archived projects section is visible
        const archivedSection = page.locator('text=Archived');
        await expect(archivedSection).toBeVisible();
    });

    test('should clear search when input is cleared', async ({ page }) => {
        const searchInput = page.locator('input[placeholder="Search projects and sources"]');

        // Type a search term
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        // Clear the search
        await searchInput.clear();
        await page.waitForTimeout(500);

        // Should show all projects again
        const projectCards = page.locator('.project');
        await expect(projectCards).toHaveCount(1);

        // No results message should not be visible
        const noResultsMessage = page.locator('.no-results-message');
        await expect(noResultsMessage).not.toBeVisible();
    });

    test('should maintain search state during navigation', async ({ page }) => {
        const searchInput = page.locator('input[placeholder="Search projects and sources"]');

        // Type a search term
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        // Navigate away and back
        await page.goto('/');
        await page.goto('/projects');

        // Search term should be preserved
        await expect(searchInput).toHaveValue('test');
    });

    test('should handle special characters in search', async ({ page }) => {
        const searchInput = page.locator('input[placeholder="Search projects and sources"]');

        // Test with special characters
        const specialSearches = ['test@', 'test#', 'test$', 'test%', 'test&'];

        for (const searchTerm of specialSearches) {
            await searchInput.fill(searchTerm);
            await page.waitForTimeout(500);

            // Should not crash and should handle gracefully
            await expect(page).not.toHaveURL(/error/);
        }
    });

    test('should handle very long search terms', async ({ page }) => {
        const searchInput = page.locator('input[placeholder="Search projects and sources"]');

        // Type a very long search term
        const longSearchTerm = 'a'.repeat(1000);
        await searchInput.fill(longSearchTerm);
        await page.waitForTimeout(500);

        // Should not crash and should show no results
        const noResultsMessage = page.locator('.no-results-message');
        await expect(noResultsMessage).toBeVisible();
    });
}); 