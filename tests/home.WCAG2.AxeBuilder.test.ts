import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright'; 

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
    // Return feedback if no subtitles are found.
    console.log("No subtitle(s) found");
    return;
  }

  // Populate 'violations' with result of the accessiblilty scan.
  let violations = accessibilityScanResults.violations;
  // Pull out 'violations' and print out each instance of 'violation' with
  // important information.
  violations.forEach((violation) => {
    console.error("Violation ID:", violation.id);
    console.error("Description:", violation.description);
    console.error("Help:", violation.help);
    console.error("Help URL:", violation.helpUrl);
    console.error("\n");
    let numberOfSameViolation = 1;
    // Print out information for each instance of a 'violation'.
    violation.nodes.forEach((node) => {
      console.error(" Violation #", numberOfSameViolation);
      console.error("  HTML:", node.html);
      console.error("  Failure Summary:", node.failureSummary);
      console.error("\n");
      numberOfSameViolation++;
    });
  });

  expect(violations.length).toEqual(0),
      "See 'stderr' Attachment from test report for Errors!";
});