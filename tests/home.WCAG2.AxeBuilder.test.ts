import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright'; 

test('Test Wordplay homepage subtitles for WCAG violations', async ({
  page,
}) => {
  await page.goto('/');
  const accessibilityScanResults = await new AxeBuilder({ page })
  // Use CSS selector to include only subtitle class for WCAG tests.
  // e.g., the "Why does this place exist" <span> element.
  .include('.link>.subtitle')
  // Limit analysis to WCAGs.
  .withTags(['wcag2a', 'wcag2aa'])
  .analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});