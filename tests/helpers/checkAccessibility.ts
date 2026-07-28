import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import type { Result } from 'axe-core';

/**
 * The project's accessibility standard: axe-detectable WCAG 2.2 Level AA.
 * These tags select every axe rule mapped to a WCAG 2.0/2.1/2.2 A or AA
 * success criterion. See CLAUDE.md's Accessibility section.
 */
export const WCAG_AA_TAGS = [
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
];

/** Render violations so a CI failure identifies the rule, element, and fix. */
function formatViolations(violations: Result[]): string {
    return violations
        .map((violation) =>
            [
                `${violation.id} (${violation.impact}): ${violation.help}`,
                `  ${violation.helpUrl}`,
                ...violation.nodes.map(
                    (node) =>
                        `  ${node.target.join(' ')}\n    ${node.html}\n    ${
                            node.failureSummary ?? ''
                        }`,
                ),
            ].join('\n'),
        )
        .join('\n\n');
}

/**
 * Fail the test on ANY axe violation at WCAG 2.2 AA on the current page.
 *
 * `exclude` and `disableRules` are escape hatches for genuinely
 * creator-authored or third-party content ONLY — every use MUST carry an
 * inline comment at the call site explaining why the region or rule is out
 * of scope. Wordplay-authored content (seeded projects, guide examples,
 * tutorial) is always in scope.
 *
 * `verbose` logs axe's "incomplete" results (checks needing human review,
 * e.g. contrast over gradients). They never gate, but are worth an
 * occasional look.
 */
export async function expectNoAxeViolations(
    page: Page,
    options?: {
        exclude?: string[];
        disableRules?: string[];
        verbose?: boolean;
    },
): Promise<void> {
    let builder = new AxeBuilder({ page }).withTags(WCAG_AA_TAGS);
    for (const selector of options?.exclude ?? [])
        builder = builder.exclude(selector);
    if (options?.disableRules !== undefined)
        builder = builder.disableRules(options.disableRules);
    const results = await builder.analyze();
    if (options?.verbose === true && results.incomplete.length > 0)
        console.log(
            `axe incomplete (needs review, not gating): ${results.incomplete
                .map((incomplete) => incomplete.id)
                .join(', ')}`,
        );
    expect(
        results.violations,
        `axe found ${results.violations.length} WCAG 2.2 AA violation(s):\n\n${formatViolations(
            results.violations,
        )}`,
    ).toEqual([]);
}
