import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { AxeResults } from 'axe-core';
import goHome from './goHome';

// Print out the accessibility scan results from AxeBuilder.
function printAccessibilityScanResults(axeBuilderScanResults: AxeResults) {
    const violations = axeBuilderScanResults.violations;
    violations.forEach((violation) => {
        console.error('Test ID:', violation.id);
        console.error('Description:', violation.description);
        console.error('Help:', violation.help);
        console.error('Help URL:', violation.helpUrl);
        console.error('\n');
        let numberOfSameViolation = 1;
        violation.nodes.forEach((node) => {
            console.error(' Violation #', numberOfSameViolation);
            console.error('  HTML:', node.html);
            console.error('  Failure Summary:', node.failureSummary);
            console.error('\n');
            numberOfSameViolation++;
        });
    });

    expect(violations.length).toEqual(0),
        'See stderr Attachment in report for Errors!';
}

test('Test Wordplay homepage subtitles for WCAG violations', async ({
    page,
}) => {
    await goHome(page);

    let accessibilityScanResults: AxeResults;
    try {
        accessibilityScanResults = await new AxeBuilder({ page })
            // Use CSS selector to include only subtitle class for WCAG tests.
            // e.g., the "Why does this place exist?" <span> element.
            .include('.link + .subtitle')
            // Limit analysis to WCAGs.
            .withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
            .analyze();
    } catch (cannotFindSubtitleLink) {
        console.log('No subtitle found');
        return;
    }
    printAccessibilityScanResults(accessibilityScanResults);
});
