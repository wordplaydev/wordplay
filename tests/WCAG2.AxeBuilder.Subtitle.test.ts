import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright'; 

//Print out the accessibility scan results from AxeBuilder.
function printAccessibilityScanResults(axeBuilderScanResults: any){
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
    // e.g., the "Why does this place exist?" <span> element.
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

async function clickLinkAndTestSubtitlesWCAG(page:Page,linkToClick: string) {  
    await page.goto('/');

    // Click the first link.
    await page.getByRole('link', { name: linkToClick }).first().click();
    
    // Ensure page is loaded for testing.
    await page.waitForURL('**/' + linkToClick.toLowerCase());
    
    // Use AxeBuilder to scan subtitles for acessiblity violations
    // with CSS selector of ".link>.subtitle".
    let accessibilityScanResults : any;
    try {
      accessibilityScanResults = await new AxeBuilder({ page })
      // Use CSS selector to include only subtitle class for WCAG test,
      // e.g., the "Why does this place exist?" <span> element.
      .include('.link>.subtitle')
      // Limit analysis to WCAGs.
      .withTags(['wcag2a', 'wcag2aa','wcag2aaa'])
      .analyze();
    } catch (cannotFindSubtitleLink) {
      console.log("No subtitle(s) found\n");
      return;
    }
    printAccessibilityScanResults(accessibilityScanResults);
}

// Do subtitle tests for all main pages.
test('Test Wordplay "Learn" page subtitles for WCAG violations', 
  async ({ page }) => {
    await clickLinkAndTestSubtitlesWCAG(page, 'Learn');
});
    
test('Test Wordplay "Projects" page subtitles for WCAG violations',
    async ({ page }) => {
      await clickLinkAndTestSubtitlesWCAG(page, 'Projects');
});
 
test('Test Wordplay "Galleries" page subtitles for WCAG violations',
    async ({ page }) => {
      await clickLinkAndTestSubtitlesWCAG(page, 'Galleries');
});

test('Test Wordplay "Login" page subtitles for WCAG violations',
    async ({ page }) => {
      await clickLinkAndTestSubtitlesWCAG(page, 'Login');
});
 
test('Test Wordplay "About" page subtitles for WCAG violations',
    async ({ page }) => {
      await clickLinkAndTestSubtitlesWCAG(page, 'About');
});
 
test('Test Wordplay "Rights" page subtitles for WCAG violations',
    async ({ page }) => {
      await clickLinkAndTestSubtitlesWCAG(page, 'Rights');
});

test('Test Wordplay "Donate" page subtitles for WCAG violations',
    async ({ page }) => {
      await clickLinkAndTestSubtitlesWCAG(page, 'Donate');
});
 