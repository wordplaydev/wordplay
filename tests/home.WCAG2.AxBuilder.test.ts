import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright'; 
// test('should not have any automatically detectable WCAG A or AA violations', async ({ page }) => {
//   await page.goto('/');

//   const accessibilityScanResults = await new AxeBuilder({ page })
//       .withTags(['wcag2a'])
//       .analyze();

//   expect(accessibilityScanResults.violations).toEqual([]);
// });



test('navigation menu should not have automatically detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/');

  //await page.getByRole('button', { name: 'Navigation Menu' }).click();

  // It is important to waitFor() the page to be in the desired
  // state before running analyze(). Otherwise, axe might not
  // find all the elements your test expects it to scan.
  //await page.locator('#navigation-menu-flyout').waitFor();

  const accessibilityScanResults = await new AxeBuilder({ page })
  .include('.link>.subtitle')
  .analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});