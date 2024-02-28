import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright'; 




// Print out the accessiblity scan results from AxeBuilder.
function printAccessibilityScanResults(axeBuilderScanResults: any) {
    // populate your array of violations
    let violations = axeBuilderScanResults.violations;
    violations.forEach((violation) => {
      console.error("Test ID:", violation.id);
      console.error("Description:", violation.description);
      console.error("Help:", violation.help);
      console.error("Help URL:", violation.helpUrl);
      console.error("\n");
      let numberOfSameViolation = 1;
      violation.nodes.forEach((node) => {
        console.error(" Violation #", numberOfSameViolation);
        console.error("  HTML:", node.html);
        console.error("  Failure Summary:", node.failureSummary);
        console.error("\n");
        numberOfSameViolation++;
      });
    });

    expect(violations.length).toEqual(0),"See stderr Attachment in report for Errors!"
}

test('Test Wordplay homepage subtitles for WCAG violations',
    async ({ page }) => {
  await page.goto('/');
  let accessibilityScanResults : any;
  try {
    accessibilityScanResults = await new AxeBuilder({ page })
    // Use CSS selector to include only subtitle class for WCAG tests.
    // e.g., the "Why does this place exist" <span> element.
    .include('.link>.subtitle')
    // Limit analysis to WCAGs.
    .withTags(['wcag2a', 'wcag2aa','wcag2aaa'])
    .analyze();
  } catch (cannotFindSubtitleLink) {
    console.log("No subtitle found");
    return;
  }
  printAccessibilityScanResults(accessibilityScanResults);
});

test('Test Wordplay "Learn" page subtitles for WCAG violations', 
  async ({ page }) => {
    await page.goto('/');
    let targetLink: string = "Learn";
    await page.getByRole('link', { name: targetLink }).first().click();
    await page.waitForURL('**/' + targetLink.toLowerCase());
    let accessibilityScanResults : any;
    try {
      accessibilityScanResults = await new AxeBuilder({ page })
      // Use CSS selector to include only subtitle class for WCAG tests.
      // e.g., the "Why does this place exist" <span> element.
      .include('.link>.subtitle')
      // Limit analysis to WCAGs.
      .withTags(['wcag2a', 'wcag2aa','wcag2aaa'])
      .analyze();
    } catch (cannotFindSubtitleLink) {
      console.log("No subtitle found\n");
      return;
    }
    printAccessibilityScanResults(accessibilityScanResults);
});

test('Test Wordplay "Projects" page subtitles for WCAG violations',
    async ({ page }) => {
  await page.goto('/');
  let targetLink: string = "Projects";
  await page.getByRole('link', { name: targetLink }).first().click();
  await page.waitForURL('**/' + targetLink.toLowerCase());
  let accessibilityScanResults : any;
  try {
    accessibilityScanResults = await new AxeBuilder({ page })
    // Use CSS selector to include only subtitle class for WCAG tests.
    // e.g., the "Why does this place exist" <span> element.
    .include('.link>.subtitle')
    // Limit analysis to WCAGs.
    .withTags(['wcag2a', 'wcag2aa','wcag2aaa'])
    .analyze();
  } catch (cannotFindSubtitleLink) {
    console.log("No subtitle found");
    return;
  }
  printAccessibilityScanResults(accessibilityScanResults);
});

test('Test Wordplay "Galleries" page subtitles for WCAG violations',
    async ({ page }) => {
  await page.goto('/');
  let targetLink: string = "Galleries";
  await page.getByRole('link', { name: targetLink }).first().click();
  await page.waitForURL('**/' + targetLink.toLowerCase());
  let accessibilityScanResults : any;
  try {
    accessibilityScanResults = await new AxeBuilder({ page })
    // Use CSS selector to include only subtitle class for WCAG tests.
    // e.g., the "Why does this place exist" <span> element.
    .include('.link>.subtitle')
    // Limit analysis to WCAGs.
    .withTags(['wcag2a', 'wcag2aa','wcag2aaa'])
    .analyze();
  } catch (cannotFindSubtitleLink) {
    console.log("No subtitle found");
    return;
  }
  printAccessibilityScanResults(accessibilityScanResults);
});

test('Test Wordplay "About" page subtitles for WCAG violations',
    async ({ page }) => {
  await page.goto('/');
  let targetLink: string = "About";
  await page.getByRole('link', { name: targetLink }).first().click();
  await page.waitForURL('**/' + targetLink.toLowerCase());
  let accessibilityScanResults : any;
  try {
    accessibilityScanResults = await new AxeBuilder({ page })
    // Use CSS selector to include only subtitle class for WCAG tests.
    // e.g., the "Why does this place exist" <span> element.
    .include('.link>.subtitle')
    // Limit analysis to WCAGs.
    .withTags(['wcag2a', 'wcag2aa','wcag2aaa'])
    .analyze();
  } catch (cannotFindSubtitleLink) {
    console.log("No subtitle found");
    return;
  }
  printAccessibilityScanResults(accessibilityScanResults);
});

test('Test Wordplay "Rights" page subtitles for WCAG violations',
    async ({ page }) => {
  await page.goto('/');
  let targetLink: string = "Rights";
  await page.getByRole('link', { name: targetLink }).first().click();
  await page.waitForURL('**/' + targetLink.toLowerCase());
  let accessibilityScanResults : any;
  try {
    accessibilityScanResults = await new AxeBuilder({ page })
    // Use CSS selector to include only subtitle class for WCAG tests.
    // e.g., the "Why does this place exist" <span> element.
    .include('.link>.subtitle')
    // Limit analysis to WCAGs.
    .withTags(['wcag2a', 'wcag2aa','wcag2aaa'])
    .analyze();
  } catch (cannotFindSubtitleLink) {
    console.log("No subtitle found");
    return;
  }
  printAccessibilityScanResults(accessibilityScanResults);
});
